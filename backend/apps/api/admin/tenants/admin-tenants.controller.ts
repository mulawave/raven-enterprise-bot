import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import * as crypto from 'crypto'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { TenantProvisionService } from '../onboarding/tenant.provision.service'
import { SuspensionService } from '../../../../libs/billing/enforcement/suspension.service'
import { SubscriptionsService, PlanTier } from '../../../../libs/billing/subscriptions.service'

interface ProvisionTenantDto {
  tenantName: string
  owner: {
    email: string
    password: string
  }
  staff?: {
    email: string
    password: string
  }
  planTier?: 'starter' | 'growth' | 'enterprise'
}

interface UpdateTenantStatusDto {
  status: 'active' | 'suspended'
}

@Controller('admin/tenants')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminTenantsController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly provisionService: TenantProvisionService,
    private readonly suspensionService: SuspensionService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * POST /admin/tenants
   * Fully provision a new tenant with atomic transaction
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(@Body() body: ProvisionTenantDto) {
    const { tenantName, owner, staff, planTier = 'starter' } = body

    if (!tenantName || !owner?.email || !owner?.password) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantName, owner.email, and owner.password are required',
        },
      }
    }

    // Use existing atomic provisioning service
    const tempStaff = staff || {
      email: `staff-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@temp.local`,
      password: crypto.randomBytes(16).toString('hex'),
    }
    const result = await this.provisionService.provision({
      tenantName,
      owner,
      staff: tempStaff,
    })

    // Create subscription via shared service (single source of truth for plan limits)
    const subscription = await this.subscriptionsService.createSubscription(
      result.tenant.id,
      planTier as PlanTier,
    )

    return {
      tenant: result.tenant,
      owner: {
        id: result.owner.id,
        email: result.owner.email,
        role: result.owner.role,
      },
      subscription: {
        id: subscription.id,
        plan_tier: subscription.plan_tier,
        status: subscription.status,
      },
    }
  }

  /**
   * GET /admin/tenants
   * List all tenants with pagination
   */
  @Get()
  async listTenants(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
  ) {
    const pageNum = parseInt(page, 10)
    const pageSizeNum = parseInt(pageSize, 10)
    const skip = (pageNum - 1) * pageSizeNum

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: pageSizeNum,
        include: {
          subscription: {
            select: {
              id: true,
              plan_tier: true,
              status: true,
              conversations_used: true,
              conversations_limit: true,
              current_period_end: true,
            },
          },
          _count: {
            select: {
              orders: true,
              bookings: true,
              customers: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.count(),
    ])

    return {
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        logo_url: t.logo_url,
        created_at: t.created_at,
        subscription: t.subscription || null,
        counts: t._count,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    }
  }

  /**
   * GET /admin/tenants/:id
   * Get full tenant details
   */
  @Get(':id')
  async getTenant(@Param('id') id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            scope: true,
            created_at: true,
          },
        },
        _count: {
          select: {
            orders: true,
            bookings: true,
            customers: true,
            conversations: true,
            messages: true,
          },
        },
      },
    })

    if (!tenant) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Tenant not found',
        },
      }
    }

    return tenant
  }

  /**
   * PATCH /admin/tenants/:id/status
   * Activate or suspend tenant
   */
  @Patch(':id/status')
  async updateTenantStatus(@Param('id') id: string, @Body() body: UpdateTenantStatusDto) {
    const { status } = body

    if (!status || !['active', 'suspended'].includes(status)) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'status must be "active" or "suspended"',
        },
      }
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Tenant not found',
        },
      }
    }

    // Use suspension service
    if (status === 'suspended') {
      await this.suspensionService.suspendTenant(id)
    } else {
      await this.suspensionService.unsuspendTenant(id)
    }

    // Log audit trail
    await this.prisma.auditLog.create({
      data: {
        tenant_id: id,
        entity_id: id,
        action: status === 'suspended' ? 'TENANT_SUSPENDED' : 'TENANT_ACTIVATED',
        timestamp: new Date(),
      },
    })

    return {
      success: true,
      tenant_id: id,
      status,
      message: `Tenant ${status === 'suspended' ? 'suspended' : 'activated'} successfully`,
    }
  }

  /**
   * POST /admin/tenants/:id/reset
   * Reset a tenant's subscription, billing counters, invoices, and onboarding state.
   * Preserves all business data (orders, bookings, messages, customers, users).
   */
  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  async resetTenant(@Param('id') id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return { error: { code: 'NOT_FOUND', message: 'Tenant not found' } }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Reset subscription counters and status
      await tx.subscription.updateMany({
        where: { tenant_id: id },
        data: {
          status: 'pending_payment',
          conversations_used: 0,
          overage_cost_kobo: 0,
        },
      })

      // 2. Delete all invoices for this tenant
      await tx.invoice.deleteMany({ where: { tenant_id: id } })

      // 3. Zero out all usage records for this tenant
      await tx.usage.deleteMany({ where: { tenant_id: id } })

      // 4. Reset onboarding state in theme so tenant must complete onboarding again
      const currentTheme = (() => {
        try { return JSON.parse(tenant.theme as string ?? '{}') } catch { return {} }
      })()
      await tx.tenant.update({
        where: { id },
        data: {
          theme: JSON.stringify({
            ...currentTheme,
            onboardingCompleted: false,
            onboardingStep: 'payment',
          }),
        },
      })

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          tenant_id: id,
          entity_id: id,
          action: 'TENANT_BILLING_RESET',
          metadata: JSON.stringify({ reset_by: 'super_admin', reset_at: new Date().toISOString() }),
          timestamp: new Date(),
        },
      })
    })

    return {
      success: true,
      tenant_id: id,
      message: 'Tenant subscription, billing counters, invoices, and onboarding state have been reset.',
    }
  }

  /**
   * GET /admin/tenants/:id/backup
   * Export a JSON snapshot of all data that a reset would destroy.
   * Captures: subscription, invoices, usage records, and tenant theme/onboarding state.
   */
  @Get(':id/backup')
  async backupTenant(@Param('id') id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        logo_url: true,
        theme: true,
        suspended: true,
        created_at: true,
        updated_at: true,
        subscription: true,
        invoices: true,
        usages: true,
      },
    })

    if (!tenant) {
      return { error: { code: 'NOT_FOUND', message: 'Tenant not found' } }
    }

    return {
      backup_version: '1',
      created_at: new Date().toISOString(),
      tenant_id: id,
      tenant_name: tenant.name,
      data: {
        tenant: {
          name: tenant.name,
          logo_url: tenant.logo_url,
          theme: tenant.theme,
          suspended: tenant.suspended,
        },
        subscription: tenant.subscription,
        invoices: tenant.invoices,
        usages: tenant.usages,
      },
    }
  }

  /**
   * POST /admin/tenants/:id/restore
   * Restore a tenant's billing state from a JSON backup created by the backup endpoint.
   * Restores: subscription, invoices, usage records, and tenant theme.
   * Does NOT touch business data (orders, bookings, customers, messages).
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreTenant(@Param('id') id: string, @Body() body: any) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } })
    if (!tenant) {
      return { error: { code: 'NOT_FOUND', message: 'Tenant not found' } }
    }

    if (!body?.data) {
      return { error: { code: 'VALIDATION_ERROR', message: 'Invalid backup: missing data field' } }
    }

    const { data } = body

    await this.prisma.$transaction(async (tx) => {
      // Restore tenant theme / onboarding state
      if (data.tenant) {
        await tx.tenant.update({
          where: { id },
          data: {
            ...(data.tenant.theme !== undefined ? { theme: data.tenant.theme } : {}),
            ...(data.tenant.logo_url !== undefined ? { logo_url: data.tenant.logo_url } : {}),
          },
        })
      }

      // Restore subscription
      if (data.subscription) {
        const sub = data.subscription
        await tx.subscription.upsert({
          where: { tenant_id: id },
          create: {
            tenant_id: id,
            plan_tier: sub.plan_tier,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start),
            current_period_end: new Date(sub.current_period_end),
            conversations_used: sub.conversations_used ?? 0,
            conversations_limit: sub.conversations_limit ?? 500,
            overage_cost_kobo: sub.overage_cost_kobo ?? 0,
            paystack_plan_code: sub.paystack_plan_code ?? null,
            paystack_subscription_code: sub.paystack_subscription_code ?? null,
          },
          update: {
            plan_tier: sub.plan_tier,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start),
            current_period_end: new Date(sub.current_period_end),
            conversations_used: sub.conversations_used ?? 0,
            conversations_limit: sub.conversations_limit ?? 500,
            overage_cost_kobo: sub.overage_cost_kobo ?? 0,
            paystack_plan_code: sub.paystack_plan_code ?? null,
            paystack_subscription_code: sub.paystack_subscription_code ?? null,
          },
        })
      }

      // Restore invoices: delete current, recreate from backup
      if (Array.isArray(data.invoices)) {
        await tx.invoice.deleteMany({ where: { tenant_id: id } })
        if (data.invoices.length > 0) {
          await tx.invoice.createMany({
            data: data.invoices.map((inv: any) => ({
              id: inv.id,
              tenant_id: id,
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
      }

      // Restore usage records
      if (Array.isArray(data.usages)) {
        await tx.usage.deleteMany({ where: { tenant_id: id } })
        if (data.usages.length > 0) {
          await tx.usage.createMany({
            data: data.usages.map((u: any) => ({
              id: u.id,
              tenant_id: id,
              key: u.key,
              count: u.count ?? 0,
              created_at: new Date(u.created_at),
              updated_at: new Date(u.updated_at),
            })),
          })
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          tenant_id: id,
          entity_id: id,
          action: 'TENANT_BILLING_RESTORED',
          metadata: JSON.stringify({ restored_by: 'super_admin', restored_at: new Date().toISOString() }),
          timestamp: new Date(),
        },
      })
    })

    return {
      success: true,
      tenant_id: id,
      message: 'Tenant subscription, billing, and onboarding state have been restored from backup.',
    }
  }
}
