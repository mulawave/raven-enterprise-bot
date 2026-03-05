import { Controller, Get, UseGuards, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'

@Controller('admin/ops')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminOpsController implements OnModuleInit, OnModuleDestroy {
  private queueAi!: Queue
  private queueOutbound!: Queue

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  onModuleInit(): void {
    this.queueAi = new Queue('ai-messages', { connection: this.redis })
    this.queueOutbound = new Queue('outbound-messages', { connection: this.redis })
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueAi?.close()
    await this.queueOutbound?.close()
  }

  /**
   * GET /admin/ops/messaging/stats
   * Message volume statistics
   */
  @Get('messaging/stats')
  async getMessagingStats() {
    // Get message counts by tenant and sender type
    const messagesByTenant = await this.prisma.message.groupBy({
      by: ['tenant_id', 'sender_type'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    // Get total message count
    const totalMessages = await this.prisma.message.count()

    // Get messages in last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentMessages = await this.prisma.message.count({
      where: {
        created_at: { gte: last24Hours },
      },
    })

    // Get conversation counts
    const totalConversations = await this.prisma.conversation.count()
    const activeConversations = await this.prisma.conversation.count({
      where: {
        updated_at: { gte: last24Hours },
      },
    })

    // Group by tenant for detailed view
    const tenantStats = await this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            messages: true,
            conversations: true,
            customers: true,
          },
        },
      },
      orderBy: {
        messages: {
          _count: 'desc',
        },
      },
      take: 20,
    })

    return {
      total_messages: totalMessages,
      messages_24h: recentMessages,
      total_conversations: totalConversations,
      active_conversations_24h: activeConversations,
      by_tenant: messagesByTenant,
      top_tenants: tenantStats,
    }
  }

  /**
   * GET /admin/ops/ai/health
   * AI processing health metrics
   */
  @Get('ai/health')
  async getAIHealth() {
    // Get AI-related audit logs
    const aiLogs = await this.prisma.auditLog.groupBy({
      by: ['tenant_id', 'action'],
      where: {
        action: { startsWith: 'AI_INTENT:' },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    // Get AI logs from last hour
    const lastHour = new Date(Date.now() - 60 * 60 * 1000)
    const recentAIActivity = await this.prisma.auditLog.count({
      where: {
        action: { startsWith: 'AI_INTENT:' },
        timestamp: { gte: lastHour },
      },
    })

    // Get total AI interactions
    const totalAIInteractions = await this.prisma.auditLog.count({
      where: {
        action: { startsWith: 'AI_INTENT:' },
      },
    })

    return {
      status: recentAIActivity > 0 ? 'active' : 'idle',
      total_ai_interactions: totalAIInteractions,
      interactions_last_hour: recentAIActivity,
      interactions_by_tenant: aiLogs,
      note: 'AI latency and failure metrics require worker instrumentation',
    }
  }

  /**
   * GET /admin/ops/queues/health
   * BullMQ queue health with real job counts
   */
  @Get('queues/health')
  async getQueueHealth() {
    const [aiCounts, outboundCounts] = await Promise.all([
      this.queueAi.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      this.queueOutbound.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    ])

    const toStatus = (counts: Record<string, number>) =>
      counts.failed > 10 ? 'degraded' : 'healthy'

    return {
      status: 'ok',
      queues: {
        'ai-messages': {
          status: toStatus(aiCounts),
          waiting: aiCounts.waiting ?? 0,
          active: aiCounts.active ?? 0,
          completed: aiCounts.completed ?? 0,
          failed: aiCounts.failed ?? 0,
          delayed: aiCounts.delayed ?? 0,
        },
        'outbound-messages': {
          status: toStatus(outboundCounts),
          waiting: outboundCounts.waiting ?? 0,
          active: outboundCounts.active ?? 0,
          completed: outboundCounts.completed ?? 0,
          failed: outboundCounts.failed ?? 0,
          delayed: outboundCounts.delayed ?? 0,
        },
      },
    }
  }

  /**
   * GET /admin/ops/orders/stats
   * Order statistics
   */
  @Get('orders/stats')
  async getOrderStats() {
    const totalOrders = await this.prisma.order.count()
    
    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentOrders = await this.prisma.order.count({
      where: {
        created_at: { gte: last24Hours },
      },
    })

    return {
      total_orders: totalOrders,
      orders_24h: recentOrders,
      by_status: ordersByStatus,
    }
  }

  /**
   * GET /admin/ops/bookings/stats
   * Booking statistics
   */
  @Get('bookings/stats')
  async getBookingStats() {
    const totalBookings = await this.prisma.booking.count()
    
    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentBookings = await this.prisma.booking.count({
      where: {
        created_at: { gte: last24Hours },
      },
    })

    return {
      total_bookings: totalBookings,
      bookings_24h: recentBookings,
      by_status: bookingsByStatus,
    }
  }
}
