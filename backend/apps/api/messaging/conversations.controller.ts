import { Controller, Get, Query } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Controller('api/messaging')
export class ConversationsController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /api/messaging/conversations?tenantId=xxx
   * Returns recent conversations for a tenant with customer info and message counts.
   */
  @Get('conversations')
  async getConversations(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      return []
    }

    const conversations = await this.prisma.conversation.findMany({
      where: { tenant_id: tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { created_at: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updated_at: 'desc' },
      take: 100,
    })

    return conversations.map((c) => ({
      sessionId: c.id,
      customerId: c.customer_id,
      customerName: c.customer.name ?? c.customer.phone ?? c.customer_id,
      messagesCount: c._count.messages,
      lastMessageAt: (c.messages[0]?.created_at ?? c.updated_at).toISOString(),
      status: c.status,
    }))
  }
}
