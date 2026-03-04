import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
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
}
