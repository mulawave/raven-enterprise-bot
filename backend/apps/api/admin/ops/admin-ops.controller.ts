import { Controller, Get, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'

@Controller('admin/ops')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminOpsController {
  constructor(private readonly prisma: PrismaClient) {}

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
   * BullMQ queue health (basic implementation)
   */
  @Get('queues/health')
  async getQueueHealth() {
    // This is a basic implementation
    // Full queue monitoring requires BullMQ queue instances
    
    return {
      status: 'monitoring_not_implemented',
      note: 'Full queue health requires BullMQ queue instance access',
      recommendation: 'Implement queue depth and worker status monitoring',
      queues: {
        'ai-messages': {
          status: 'unknown',
          depth: null,
          processing_rate: null,
        },
        'outbound-messages': {
          status: 'unknown',
          depth: null,
          processing_rate: null,
        },
      },
      workers: {
        'ai-processor': {
          status: 'unknown',
          jobs_completed: null,
        },
        'message-retry': {
          status: 'unknown',
          jobs_completed: null,
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
