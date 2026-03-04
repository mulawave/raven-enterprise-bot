import type { ConversationState } from './state.machine'
import type { Intent } from './intent.router'

export interface SessionData {
  state: ConversationState
  lastIntent: Intent | null
  tenantId: string | null
  userId: string | null
}

export interface RedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<unknown>
}

export class RedisSessionStore {
  private readonly prefix = 'ai-session:'
  private readonly ttlSeconds: number

  constructor(private readonly redis: RedisClient, ttlSeconds = 3600) {
    this.ttlSeconds = ttlSeconds
  }

  async get(sessionId: string): Promise<SessionData> {
    const raw = await this.redis.get(this.key(sessionId))
    if (!raw) {
      const fallback: SessionData = { state: 'Idle', lastIntent: null, tenantId: null, userId: null }
      await this.set(sessionId, fallback)
      return fallback
    }
    try {
      const parsed = JSON.parse(raw) as SessionData
      const hydrated: SessionData = {
        state: parsed.state || 'Idle',
        lastIntent: parsed.lastIntent || null,
        tenantId: parsed.tenantId ?? null,
        userId: parsed.userId ?? null,
      }
      await this.set(sessionId, hydrated)
      return hydrated
    } catch {
      const fallback: SessionData = { state: 'Idle', lastIntent: null, tenantId: null, userId: null }
      await this.set(sessionId, fallback)
      return fallback
    }
  }

  async set(sessionId: string, data: SessionData): Promise<void> {
    const payload = JSON.stringify(data)
    await this.redis.set(this.key(sessionId), payload, 'EX', this.ttlSeconds)
  }

  private key(sessionId: string): string {
    return `${this.prefix}${sessionId}`
  }
}
