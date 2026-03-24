import { Controller, Get, Post, Patch, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'

const BACKUP_GATE_KEY = 'require_backup_before_reset'

@Controller('admin/reset')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminResetController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /admin/reset/config
   * Returns platform reset configuration flags.
   */
  @Get('config')
  async getResetConfig() {
    const row = await this.prisma.systemConfig.findUnique({ where: { key: BACKUP_GATE_KEY } })
    return { require_backup_before_reset: row?.value === 'true' }
  }

  /**
   * PATCH /admin/reset/config
   * Upserts platform reset configuration flags.
   */
  @Patch('config')
  async updateResetConfig(@Body() body: { require_backup_before_reset: boolean }) {
    const value = body.require_backup_before_reset ? 'true' : 'false'
    await this.prisma.systemConfig.upsert({
      where: { key: BACKUP_GATE_KEY },
      update: { value },
      create: {
        key: BACKUP_GATE_KEY,
        value,
        description: 'When enabled, super admin must download a platform backup before the reset button is unlocked.',
        group: 'platform',
        is_secret: false,
      },
    })
    return { require_backup_before_reset: body.require_backup_before_reset }
  }

  /**
   * GET /admin/reset/stats
   * Live counts of ALL tenant-owned data that will be permanently deleted on reset.
   */
  @Get('stats')
  async getResetStats() {
    const [
      tenants,
      users,
      customers,
      conversations,
      messages,
      orders,
      bookings,
      payments,
      branches,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count({ where: { scope: 'TENANT' } }),
      this.prisma.customer.count(),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.order.count(),
      this.prisma.booking.count(),
      this.prisma.payment.count(),
      this.prisma.branch.count(),
    ])

    return { tenants, users, customers, conversations, messages, orders, bookings, payments, branches }
  }

  /**
   * GET /admin/reset/backup
   * Full export of every tenant and every record they own.
   * Use this backup to fully restore the platform after a reset.
   */
  @Get('backup')
  async createBackup() {
    const [
      tenants,
      users,
      branches,
      staffBranches,
      customers,
      conversations,
      messages,
      menuCategories,
      menuItems,
      roomTypes,
      orders,
      orderItems,
      orderAudits,
      bookings,
      payments,
      paymentAudits,
      subscriptions,
      invoices,
      usages,
      featureFlags,
      kyc,
      bankAccounts,
      withdrawals,
      staffNotifications,
      slaLogs,
      dataDeletionRequests,
      tenantAssignments,
    ] = await Promise.all([
      this.prisma.tenant.findMany(),
      this.prisma.user.findMany({ where: { scope: 'TENANT' } }),
      this.prisma.branch.findMany(),
      this.prisma.staffBranch.findMany(),
      this.prisma.customer.findMany(),
      this.prisma.conversation.findMany(),
      this.prisma.message.findMany(),
      this.prisma.menuCategory.findMany(),
      this.prisma.menuItem.findMany(),
      this.prisma.roomType.findMany(),
      this.prisma.order.findMany(),
      this.prisma.orderItem.findMany(),
      this.prisma.orderAudit.findMany(),
      this.prisma.booking.findMany(),
      this.prisma.payment.findMany(),
      this.prisma.paymentAudit.findMany(),
      this.prisma.subscription.findMany(),
      this.prisma.invoice.findMany(),
      this.prisma.usage.findMany(),
      this.prisma.featureFlag.findMany(),
      this.prisma.tenantKyc.findMany(),
      this.prisma.tenantBankAccount.findMany(),
      this.prisma.withdrawal.findMany(),
      this.prisma.staffNotification.findMany(),
      this.prisma.slaLog.findMany(),
      this.prisma.dataDeletionRequest.findMany(),
      this.prisma.tenantAssignment.findMany(),
    ])

    const userIds = users.map((u) => u.id)
    const consents = userIds.length > 0
      ? await this.prisma.consent.findMany({ where: { user_id: { in: userIds } } })
      : []

    return {
      backup_version: '3',
      type: 'global',
      created_at: new Date().toISOString(),
      summary: {
        tenants: tenants.length,
        users: users.length,
        branches: branches.length,
        customers: customers.length,
        conversations: conversations.length,
        messages: messages.length,
        orders: orders.length,
        bookings: bookings.length,
        payments: payments.length,
      },
      data: {
        tenants,
        users,
        branches,
        staffBranches,
        customers,
        conversations,
        messages,
        menuCategories,
        menuItems,
        roomTypes,
        orders,
        orderItems,
        orderAudits,
        bookings,
        payments,
        paymentAudits,
        subscriptions,
        invoices,
        usages,
        featureFlags,
        kyc,
        bankAccounts,
        withdrawals,
        staffNotifications,
        slaLogs,
        dataDeletionRequests,
        tenantAssignments,
        consents,
      },
    }
  }

  /**
   * POST /admin/reset
   * Deletes ALL tenants and every record they own across the entire platform.
   * The database CASCADE handles all 25+ related tables automatically.
   * Preserved (no tenant FK): SystemConfig, AppSettings, Plans, admin Users (scope=SYSTEM).
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async executeReset() {
    const count = await this.prisma.tenant.count()
    // One call â€” the database CASCADE deletes all branches, users, customers, conversations,
    // messages, orders, bookings, payments, subscriptions, invoices, usage, menus, rooms,
    // withdrawals, KYC, staff notifications, and every other tenant-owned record.
    await this.prisma.tenant.deleteMany()
    return {
      success: true,
      tenants_affected: count,
      message: `Platform reset complete. ${count} tenant(s) and all their data have been permanently deleted.`,
    }
  }

  /**
   * POST /admin/reset/restore
   * Fully restores the platform from a global backup created by GET /admin/reset/backup.
   * Recreates all tenants and their data in correct FK dependency order.
   */
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  async restoreBackup(@Body() body: any) {
    if (!body?.data) {
      return { error: { code: 'VALIDATION_ERROR', message: 'Invalid backup: missing data field' } }
    }
    if (body.type !== 'global') {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'This is not a global backup. Only backups downloaded from the Platform Reset page are accepted here.',
        },
      }
    }

    const d = body.data

    await this.prisma.$transaction(
      async (tx) => {
        // Wipe current state before restoring so there are no ID conflicts
        await tx.tenant.deleteMany()

        // 1. Tenants â€” root of all cascades
        if (d.tenants?.length) {
          await tx.tenant.createMany({
            data: d.tenants.map((t: any) => ({
              id: t.id,
              name: t.name,
              logo_url: t.logo_url ?? null,
              theme: t.theme ?? null,
              suspended: t.suspended ?? false,
              created_at: new Date(t.created_at),
              updated_at: new Date(t.updated_at),
            })),
          })
        }

        // 2. Tenant-scoped users
        if (d.users?.length) {
          await tx.user.createMany({
            data: d.users.map((u: any) => ({
              id: u.id,
              tenant_id: u.tenant_id ?? null,
              email: u.email,
              password: u.password,
              role: u.role,
              scope: u.scope,
              name: u.name ?? null,
              avatar_url: u.avatar_url ?? null,
              created_at: new Date(u.created_at),
              updated_at: new Date(u.updated_at),
            })),
          })
        }

        // 3. Branches
        if (d.branches?.length) {
          await tx.branch.createMany({
            data: d.branches.map((b: any) => ({
              id: b.id,
              tenant_id: b.tenant_id,
              name: b.name,
              created_at: new Date(b.created_at),
              updated_at: new Date(b.updated_at),
            })),
          })
        }

        // 4. Staffâ€“branch assignments (depends on users + branches)
        if (d.staffBranches?.length) {
          await tx.staffBranch.createMany({
            data: d.staffBranches.map((sb: any) => ({
              id: sb.id,
              user_id: sb.user_id,
              branch_id: sb.branch_id,
              created_at: new Date(sb.created_at),
            })),
          })
        }

        // 5. Menu categories
        if (d.menuCategories?.length) {
          await tx.menuCategory.createMany({
            data: d.menuCategories.map((mc: any) => ({
              id: mc.id,
              tenant_id: mc.tenant_id,
              name: mc.name,
              created_at: new Date(mc.created_at),
            })),
          })
        }

        // 6. Menu items (depends on categories)
        if (d.menuItems?.length) {
          await tx.menuItem.createMany({
            data: d.menuItems.map((mi: any) => ({
              id: mi.id,
              tenant_id: mi.tenant_id,
              category_id: mi.category_id,
              name: mi.name,
              price_kobo: mi.price_kobo,
              available: mi.available ?? true,
              created_at: new Date(mi.created_at),
              updated_at: new Date(mi.updated_at),
            })),
          })
        }

        // 7. Room types
        if (d.roomTypes?.length) {
          await tx.roomType.createMany({
            data: d.roomTypes.map((rt: any) => ({
              id: rt.id,
              tenant_id: rt.tenant_id,
              name: rt.name,
              price_kobo: rt.price_kobo,
              created_at: new Date(rt.created_at),
              updated_at: new Date(rt.updated_at),
            })),
          })
        }

        // 8. Customers
        if (d.customers?.length) {
          await tx.customer.createMany({
            data: d.customers.map((c: any) => ({
              id: c.id,
              tenant_id: c.tenant_id,
              name: c.name ?? null,
              email: c.email ?? null,
              phone: c.phone ?? null,
              created_at: new Date(c.created_at),
              updated_at: new Date(c.updated_at),
            })),
          })
        }

        // 9. Conversations (depends on customers)
        if (d.conversations?.length) {
          await tx.conversation.createMany({
            data: d.conversations.map((cv: any) => ({
              id: cv.id,
              tenant_id: cv.tenant_id,
              customer_id: cv.customer_id,
              status: cv.status,
              created_at: new Date(cv.created_at),
              updated_at: new Date(cv.updated_at),
            })),
          })
        }

        // 10. Messages (depends on conversations)
        if (d.messages?.length) {
          await tx.message.createMany({
            data: d.messages.map((m: any) => ({
              id: m.id,
              tenant_id: m.tenant_id,
              conversation_id: m.conversation_id,
              sender_type: m.sender_type,
              sender_id: m.sender_id ?? null,
              content: m.content,
              created_at: new Date(m.created_at),
            })),
          })
        }

        // 11. Orders (depends on branches + customers)
        if (d.orders?.length) {
          await tx.order.createMany({
            data: d.orders.map((o: any) => ({
              id: o.id,
              tenant_id: o.tenant_id,
              branch_id: o.branch_id,
              customer_id: o.customer_id,
              total_kobo: o.total_kobo,
              status: o.status,
              created_at: new Date(o.created_at),
              updated_at: new Date(o.updated_at),
            })),
          })
        }

        // 12. Order items (depends on orders + menu items)
        if (d.orderItems?.length) {
          await tx.orderItem.createMany({
            data: d.orderItems.map((oi: any) => ({
              id: oi.id,
              tenant_id: oi.tenant_id,
              order_id: oi.order_id,
              menu_item_id: oi.menu_item_id,
              quantity: oi.quantity,
              price_kobo: oi.price_kobo,
              created_at: new Date(oi.created_at),
            })),
          })
        }

        // 13. Bookings (depends on branches + customers + room types)
        if (d.bookings?.length) {
          await tx.booking.createMany({
            data: d.bookings.map((bk: any) => ({
              id: bk.id,
              tenant_id: bk.tenant_id,
              branch_id: bk.branch_id,
              customer_id: bk.customer_id,
              room_type_id: bk.room_type_id,
              start_date: new Date(bk.start_date),
              end_date: new Date(bk.end_date),
              total_kobo: bk.total_kobo,
              status: bk.status,
              created_at: new Date(bk.created_at),
              updated_at: new Date(bk.updated_at),
            })),
          })
        }

        // 14. Payments (depends on orders + bookings)
        if (d.payments?.length) {
          await tx.payment.createMany({
            data: d.payments.map((p: any) => ({
              id: p.id,
              tenant_id: p.tenant_id,
              order_id: p.order_id ?? null,
              booking_id: p.booking_id ?? null,
              amount_kobo: p.amount_kobo,
              status: p.status,
              reference: p.reference,
              provider: p.provider ?? null,
              created_at: new Date(p.created_at),
              updated_at: new Date(p.updated_at),
            })),
          })
        }

        // 15. Payment audits (depends on payments)
        if (d.paymentAudits?.length) {
          await tx.paymentAudit.createMany({
            data: d.paymentAudits.map((pa: any) => ({
              id: pa.id,
              tenant_id: pa.tenant_id,
              payment_id: pa.payment_id,
              status: pa.status,
              reference: pa.reference,
              created_at: new Date(pa.created_at),
            })),
          })
        }

        // 16. Order audits (depends on orders + users)
        if (d.orderAudits?.length) {
          await tx.orderAudit.createMany({
            data: d.orderAudits.map((oa: any) => ({
              id: oa.id,
              tenant_id: oa.tenant_id,
              order_id: oa.order_id,
              status: oa.status,
              user_id: oa.user_id ?? null,
              created_at: new Date(oa.created_at),
            })),
          })
        }

        // 17. Subscriptions
        if (d.subscriptions?.length) {
          await tx.subscription.createMany({
            data: d.subscriptions.map((s: any) => ({
              id: s.id,
              tenant_id: s.tenant_id,
              plan_tier: s.plan_tier,
              status: s.status,
              current_period_start: new Date(s.current_period_start),
              current_period_end: new Date(s.current_period_end),
              conversations_used: s.conversations_used ?? 0,
              conversations_limit: s.conversations_limit ?? 500,
              overage_cost_kobo: s.overage_cost_kobo ?? 0,
              paystack_plan_code: s.paystack_plan_code ?? null,
              paystack_subscription_code: s.paystack_subscription_code ?? null,
              created_at: new Date(s.created_at),
              updated_at: new Date(s.updated_at),
            })),
          })
        }

        // 18. Invoices
        if (d.invoices?.length) {
          await tx.invoice.createMany({
            data: d.invoices.map((inv: any) => ({
              id: inv.id,
              tenant_id: inv.tenant_id,
              plan: inv.plan,
              period: inv.period,
              amount: inv.amount,
              status: inv.status,
              reference: inv.reference ?? null,
              created_at: new Date(inv.created_at),
              updated_at: new Date(inv.updated_at),
            })),
          })
        }

        // 19. Usage records
        if (d.usages?.length) {
          await tx.usage.createMany({
            data: d.usages.map((u: any) => ({
              id: u.id,
              tenant_id: u.tenant_id,
              key: u.key,
              count: u.count ?? 0,
              created_at: new Date(u.created_at),
              updated_at: new Date(u.updated_at),
            })),
          })
        }

        // 20. Feature flags
        if (d.featureFlags?.length) {
          await tx.featureFlag.createMany({
            data: d.featureFlags.map((ff: any) => ({
              id: ff.id,
              tenant_id: ff.tenant_id,
              flag: ff.flag,
              enabled: ff.enabled ?? false,
              created_at: new Date(ff.created_at),
              updated_at: new Date(ff.updated_at),
            })),
          })
        }

        // 21. KYC records
        if (d.kyc?.length) {
          await tx.tenantKyc.createMany({
            data: d.kyc.map((k: any) => ({
              id: k.id,
              tenant_id: k.tenant_id,
              status: k.status,
              full_name: k.full_name ?? null,
              id_type: k.id_type ?? null,
              id_number: k.id_number ?? null,
              submitted_at: k.submitted_at ? new Date(k.submitted_at) : null,
              verified_at: k.verified_at ? new Date(k.verified_at) : null,
              created_at: new Date(k.created_at),
              updated_at: new Date(k.updated_at),
            })),
          })
        }

        // 22. Bank accounts
        if (d.bankAccounts?.length) {
          await tx.tenantBankAccount.createMany({
            data: d.bankAccounts.map((ba: any) => ({
              id: ba.id,
              tenant_id: ba.tenant_id,
              bank_name: ba.bank_name,
              bank_code: ba.bank_code,
              account_number: ba.account_number,
              account_name: ba.account_name,
              created_at: new Date(ba.created_at),
              updated_at: new Date(ba.updated_at),
            })),
          })
        }

        // 23. Withdrawals
        if (d.withdrawals?.length) {
          await tx.withdrawal.createMany({
            data: d.withdrawals.map((w: any) => ({
              id: w.id,
              tenant_id: w.tenant_id,
              amount_kobo: w.amount_kobo,
              account_number: w.account_number,
              bank_code: w.bank_code,
              bank_name: w.bank_name,
              account_name: w.account_name,
              status: w.status,
              provider: w.provider ?? 'flutterwave',
              reference: w.reference,
              provider_ref: w.provider_ref ?? null,
              failure_reason: w.failure_reason ?? null,
              created_at: new Date(w.created_at),
              updated_at: new Date(w.updated_at),
            })),
          })
        }

        // 24. Staff notifications (depends on users)
        if (d.staffNotifications?.length) {
          await tx.staffNotification.createMany({
            data: d.staffNotifications.map((sn: any) => ({
              id: sn.id,
              tenant_id: sn.tenant_id,
              user_id: sn.user_id,
              message: sn.message,
              read: sn.read ?? false,
              created_at: new Date(sn.created_at),
            })),
          })
        }

        // 25. SLA logs
        if (d.slaLogs?.length) {
          await tx.slaLog.createMany({
            data: d.slaLogs.map((sl: any) => ({
              id: sl.id,
              tenant_id: sl.tenant_id,
              metric: sl.metric,
              value: sl.value,
              timestamp: new Date(sl.timestamp),
            })),
          })
        }

        // 26. Data deletion requests
        if (d.dataDeletionRequests?.length) {
          await tx.dataDeletionRequest.createMany({
            data: d.dataDeletionRequests.map((dr: any) => ({
              id: dr.id,
              tenant_id: dr.tenant_id,
              confirmation_code: dr.confirmation_code,
              identifier: dr.identifier,
              identifier_type: dr.identifier_type,
              status: dr.status,
              source: dr.source ?? 'manual',
              requested_at: new Date(dr.requested_at),
              completed_at: dr.completed_at ? new Date(dr.completed_at) : null,
              notes: dr.notes ?? null,
            })),
          })
        }

        // 27. Tenant assignments (reseller accounts survive the reset so refs remain valid)
        if (d.tenantAssignments?.length) {
          await tx.tenantAssignment.createMany({
            data: d.tenantAssignments.map((ta: any) => ({
              id: ta.id,
              reseller_id: ta.reseller_id,
              tenant_id: ta.tenant_id,
              assigned_at: new Date(ta.assigned_at),
            })),
            skipDuplicates: true,
          })
        }

        // 28. Consents (depends on users)
        if (d.consents?.length) {
          await tx.consent.createMany({
            data: d.consents.map((c: any) => ({
              id: c.id,
              user_id: c.user_id,
              type: c.type,
              timestamp: new Date(c.timestamp),
              created_at: new Date(c.created_at),
            })),
          })
        }
      },
      { timeout: 120_000 },
    )

    return {
      success: true,
      message: 'Platform fully restored from backup. All tenants and their data have been recreated.',
    }
  }
}

