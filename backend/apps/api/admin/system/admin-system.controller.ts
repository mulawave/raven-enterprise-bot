import { Controller, Get, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { Redis } from 'ioredis'

@Controller('admin/system')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminSystemController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  /**
   * GET /admin/system/health
   * Aggregated system health check
   */
  @Get('health')
  async getSystemHealth() {
    const startTime = Date.now()
    
    // Check database
    const dbHealth = await this.checkDatabase()
    
    // Check Redis
    const redisHealth = await this.checkRedis()
    
    // Determine overall status
    const allHealthy = dbHealth.status === 'up' && redisHealth.status === 'up'
    const overallStatus = allHealthy ? 'healthy' : 'degraded'

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_ms: process.uptime() * 1000,
      components: {
        database: dbHealth,
        redis: redisHealth,
        queues: {
          note: 'Queue monitoring requires BullMQ instrumentation',
          'ai-messages': { status: 'unknown', depth: null, processing_rate: null },
          'outbound-messages': { status: 'unknown', depth: null, processing_rate: null },
        },
        workers: {
          note: 'Worker monitoring requires process instrumentation',
          'ai-processor': { status: 'unknown', jobs_completed: null },
          'message-retry': { status: 'unknown', jobs_completed: null },
        },
      },
      response_time_ms: Date.now() - startTime,
    }
  }

  private async checkDatabase() {
    try {
      const start = Date.now()
      await this.prisma.$queryRaw`SELECT 1`
      const latency = Date.now() - start

      return {
        status: 'up',
        latency_ms: latency,
        message: 'Database connection successful',
      }
    } catch (error) {
      return {
        status: 'down',
        latency_ms: null,
        message: 'Database connection failed',
        error: (error as Error).message,
      }
    }
  }

  private async checkRedis() {
    try {
      const start = Date.now()
      await this.redis.ping()
      const latency = Date.now() - start

      return {
        status: 'up',
        latency_ms: latency,
        message: 'Redis connection successful',
      }
    } catch (error) {
      return {
        status: 'down',
        latency_ms: null,
        message: 'Redis connection failed',
        error: (error as Error).message,
      }
    }
  }

  /**
   * GET /admin/system/stats
   * System-wide statistics
   */
  @Get('stats')
  async getSystemStats() {
    const [
      totalTenants,
      totalUsers,
      totalCustomers,
      totalOrders,
      totalBookings,
      totalMessages,
      totalConversations,
      totalPayments,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.customer.count(),
      this.prisma.order.count(),
      this.prisma.booking.count(),
      this.prisma.message.count(),
      this.prisma.conversation.count(),
      this.prisma.payment.count(),
    ])

    // Get active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: { status: 'active' },
    })

    // Get successful payments
    const paidPayments = await this.prisma.payment.count({
      where: { status: 'paid' },
    })

    return {
      tenants: {
        total: totalTenants,
        with_active_subscriptions: activeSubscriptions,
      },
      users: {
        total: totalUsers,
      },
      customers: {
        total: totalCustomers,
      },
      orders: {
        total: totalOrders,
      },
      bookings: {
        total: totalBookings,
      },
      messaging: {
        total_messages: totalMessages,
        total_conversations: totalConversations,
      },
      payments: {
        total: totalPayments,
        paid: paidPayments,
        success_rate: totalPayments > 0 ? ((paidPayments / totalPayments) * 100).toFixed(2) + '%' : '0%',
      },
    }
  }
}
