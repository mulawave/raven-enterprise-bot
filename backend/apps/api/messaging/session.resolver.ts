import { PrismaClient } from '@prisma/client'

interface ResolvedSession {
  conversationId: string
  customerId: string
  tenantId: string
}

export class SessionResolver {
  constructor(private readonly prisma: PrismaClient) {}

  async resolve(phoneNumberId: string, customerPhone: string): Promise<ResolvedSession> {
    // For MVP, use first tenant (in production, look up by phoneNumberId → channel → tenant)
    const tenant = await this.prisma.tenant.findFirst()
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
}
