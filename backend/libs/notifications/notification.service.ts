import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import * as admin from 'firebase-admin'
import { ConfigLoaderService } from '../config/config-loader.service'

export type NotificationType =
  | 'escalation'
  | 'order_new'
  | 'order_status'
  | 'payment'
  | 'new_tenant'
  | 'alert'
  | 'broadcast'

export interface SendNotificationOpts {
  /** Target a single user (dashboard staff/owner) */
  userId?: string
  /** Target all users of a tenant */
  tenantId?: string
  /** Target all admin users (SYSTEM scope) – for new_tenant / global alerts */
  toAdmins?: boolean
  title: string
  body: string
  type: NotificationType
  /** Extra JSON-serialisable data forwarded to FCM data payload */
  data?: Record<string, string>
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name)
  private fcmReady = false

  constructor(
    private readonly prisma: PrismaClient,
    private readonly configLoader: ConfigLoaderService,
  ) {}

  async onModuleInit() {
    await this.initFcm()
  }

  // ── FCM initialisation ────────────────────────────────────────────────────

  private async initFcm() {
    if (admin.apps.length) { this.fcmReady = true; return }

    const credsJson =
      (await this.configLoader.get('FCM_SERVICE_ACCOUNT_JSON').catch(() => null)) ??
      process.env.FCM_SERVICE_ACCOUNT_JSON

    if (!credsJson) {
      this.logger.warn('FCM_SERVICE_ACCOUNT_JSON not configured — push notifications disabled')
      return
    }

    try {
      const creds = JSON.parse(credsJson)
      admin.initializeApp({ credential: admin.credential.cert(creds) })
      this.fcmReady = true
      this.logger.log('Firebase Admin SDK initialised')
    } catch (err) {
      this.logger.error(`Failed to initialise Firebase: ${(err as Error).message}`)
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Register or refresh a device FCM token for a user/tenant.
   */
  async registerToken(token: string, opts: { userId?: string; tenantId?: string; platform?: string }) {
    await this.prisma.fcmToken.upsert({
      where: { token },
      create: {
        token,
        user_id: opts.userId ?? null,
        tenant_id: opts.tenantId ?? null,
        platform: opts.platform ?? 'web',
      },
      update: {
        user_id: opts.userId ?? undefined,
        tenant_id: opts.tenantId ?? undefined,
        updated_at: new Date(),
      },
    })
  }

  /**
   * Unregister a device token (called on logout).
   */
  async unregisterToken(token: string) {
    await this.prisma.fcmToken.deleteMany({ where: { token } })
  }

  /**
   * Send a notification. Persists to AppNotification table AND fires FCM push.
   */
  async send(opts: SendNotificationOpts): Promise<void> {
    const { title, body, type, data } = opts

    // 1. Resolve target user IDs
    const userIds = await this.resolveUserIds(opts)
    if (!userIds.length) return

    // 2. Persist in-app notification for each user
    await this.prisma.appNotification.createMany({
      data: userIds.map((uid) => ({
        user_id: uid,
        tenant_id: opts.tenantId ?? null,
        title,
        body,
        type,
        data: data ? JSON.stringify(data) : null,
      })),
    })

    // 3. Collect FCM tokens for these users
    if (!this.fcmReady) return

    const tokenRows = await this.prisma.fcmToken.findMany({
      where: { user_id: { in: userIds } },
      select: { token: true },
    })
    const tokens = tokenRows.map((r) => r.token)
    if (!tokens.length) return

    // 4. Send FCM multicast (batched max 500 per FCM spec)
    await this.sendFcmMulticast(tokens, { title, body, type, data })
  }

  /**
   * Send a raw FCM push to specific tokens (e.g., admin devices even without a user_id row).
   */
  async sendToTokens(tokens: string[], payload: { title: string; body: string; type: string; data?: Record<string, string> }) {
    if (!this.fcmReady || !tokens.length) return
    await this.sendFcmMulticast(tokens, payload)
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async resolveUserIds(opts: SendNotificationOpts): Promise<string[]> {
    const ids = new Set<string>()

    if (opts.userId) ids.add(opts.userId)

    if (opts.tenantId) {
      const users = await this.prisma.user.findMany({
        where: { tenant_id: opts.tenantId },
        select: { id: true },
      })
      users.forEach((u) => ids.add(u.id))
    }

    if (opts.toAdmins) {
      const admins = await this.prisma.user.findMany({
        where: { scope: 'SYSTEM' },
        select: { id: true },
      })
      admins.forEach((u) => ids.add(u.id))
    }

    return [...ids]
  }

  private async sendFcmMulticast(
    tokens: string[],
    payload: { title: string; body: string; type: string; data?: Record<string, string> },
  ) {
    const BATCH = 500
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH)
      try {
        const message: admin.messaging.MulticastMessage = {
          tokens: batch,
          notification: { title: payload.title, body: payload.body },
          data: { type: payload.type, ...payload.data },
          android: { priority: 'high', notification: { channelId: 'raven_alerts', priority: 'high', defaultSound: true } },
          apns: { payload: { aps: { sound: 'default', badge: 1, contentAvailable: true } } },
          webpush: {
            headers: { Urgency: 'high' },
            notification: { title: payload.title, body: payload.body, icon: '/icon-192.png', badge: '/badge-72.png', requireInteraction: true },
          },
        }
        const res = await admin.messaging().sendEachForMulticast(message)
        const failed = res.responses.filter((r) => !r.success)
        if (failed.length) {
          this.logger.warn(`${failed.length}/${batch.length} FCM messages failed`)
          // Remove stale tokens
          const staleTokens = failed
            .map((r, idx) => (r.error?.code === 'messaging/registration-token-not-registered' ? batch[idx] : null))
            .filter(Boolean) as string[]
          if (staleTokens.length) {
            await this.prisma.fcmToken.deleteMany({ where: { token: { in: staleTokens } } })
          }
        }
        this.logger.log(`FCM: sent ${res.successCount}/${batch.length} notifications (type=${payload.type})`)
      } catch (err) {
        this.logger.error(`FCM multicast failed: ${(err as Error).message}`)
      }
    }
  }
}
