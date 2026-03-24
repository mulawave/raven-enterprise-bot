import { PrismaClient } from '@prisma/client'

interface ResolvedSession {
  conversationId: string
  customerId: string
  tenantId: string
}

export class SessionResolver {
  constructor(private readonly prisma: PrismaClient) {}

  async resolve(phoneNumberId: string, customerPhone: string): Promise<ResolvedSession> {
    // Attempt to route to the tenant whose META_PHONE_NUMBER_ID matches the incoming message.
    // Fallback: use the first tenant (MVP behaviour for single-tenant setups).
    let tenant = await this.findTenantByPhoneNumberId(phoneNumberId)

    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst()
    }

    if (!tenant) {
      throw new Error('No tenant found')
    }

    // Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        tenant_id: tenant.id,
        phone: customerPhone,
      },
    })

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenant_id: tenant.id,
          name: `Customer ${customerPhone}`,
          phone: customerPhone,
        },
      })
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenant_id: tenant.id,
        customer_id: customer.id,
      },
      orderBy: {
        updated_at: 'desc',
      },
    })

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenant_id: tenant.id,
          customer_id: customer.id,
        },
      })
    }

    return {
      conversationId: conversation.id,
      customerId: customer.id,
      tenantId: tenant.id,
    }
  }

  /**
   * Scan all tenants and return the one whose theme contains a matching META_PHONE_NUMBER_ID.
   * Returns null if no tenant is configured with that phone number ID.
   */
  private async findTenantByPhoneNumberId(phoneNumberId: string): Promise<{ id: string } | null> {
    if (!phoneNumberId) return null

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, theme: true },
    })

    for (const t of tenants) {
      if (!t.theme) continue
      try {
        const theme = JSON.parse(t.theme) as Record<string, unknown>
        if (typeof theme.META_PHONE_NUMBER_ID === 'string' && theme.META_PHONE_NUMBER_ID === phoneNumberId) {
          return { id: t.id }
        }
      } catch {
        // ignore invalid JSON
      }
    }

    return null
  }
}
