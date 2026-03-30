import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { FALLBACK_TEXT } from '../../../../libs/ai-engine/prompts'
import type { GeneratedPrismaClient } from '../../../../types/prisma-generated'

export interface ProvisionUserInput {
  email: string
  password: string
  name?: string
}

export interface TenantProvisionInput {
  tenantName: string
  owner: ProvisionUserInput
  staff: ProvisionUserInput
}

@Injectable()
export class TenantProvisionService {
  constructor(private readonly prisma: PrismaClient) {}

  private get db(): GeneratedPrismaClient {
    return this.prisma as unknown as GeneratedPrismaClient
  }

  async provision(input: TenantProvisionInput) {
    const [ownerHash, staffHash] = await Promise.all([
      bcrypt.hash(input.owner.password, 10),
      bcrypt.hash(input.staff.password, 10),
    ])

    // Plan capacity gate
    if (process.env.LICENSING_ENABLED !== 'false') {
      const inst = await this.db.instanceActivation.findFirst({ where: { status: 'ACTIVE' } }).catch(() => null)
      if (!inst) throw new Error('SERVICE_TEMPORARILY_UNAVAILABLE')
      if (inst.license_type === 'REGULAR') {
        const tenantCount = await this.prisma.tenant.count()
        if (tenantCount >= 1) throw new Error('PLAN_LIMIT_REACHED')
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: input.tenantName },
      })

      const owner = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          email: input.owner.email,
          password: ownerHash,
          role: 'owner',
          name: input.owner.name ?? null,
        },
      })

      const staff = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          email: input.staff.email,
          password: staffHash,
          role: 'staff',
          name: input.staff.name ?? null,
        },
      })

      const menuCategory = await tx.menuCategory.create({
        data: {
          tenant_id: tenant.id,
          name: `${tenant.name} Menu`,
        },
      })

      const menuItem = await tx.menuItem.create({
        data: {
          tenant_id: tenant.id,
          category_id: menuCategory.id,
          name: `${tenant.name} Item`,
          price_kobo: 0,
          available: false,
        },
      })

      const roomType = await tx.roomType.create({
        data: {
          tenant_id: tenant.id,
          name: `${tenant.name} Room`,
          price_kobo: 0,
        },
      })

      const botConfig = {
        fallbackText: FALLBACK_TEXT,
      }

      return { tenant, owner, staff, botConfig, menuCategory, menuItem, roomType }
    })
  }
}
