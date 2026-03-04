import { Controller, Get } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  checks: {
    database: { status: 'up' | 'down'; latencyMs?: number; error?: string }
    redis: { status: 'up' | 'down'; latencyMs?: number; error?: string }
  }
}

@Controller('api')
export class ReadinessController {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
  ) {}

  private readonly CHECK_TIMEOUT_MS = 1500

  @Get('ready')
  async checkReadiness(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString()
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    }

    const allHealthy = checks.database.status === 'up' && checks.redis.status === 'up'

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      checks,
    }
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`, this.CHECK_TIMEOUT_MS, 'Database check timed out')
      const latencyMs = Date.now() - start
      return { status: 'up', latencyMs }
    } catch (error: any) {
      return { status: 'down', error: error.message }
    }
  }

  private async checkRedis(): Promise<{ status: 'up' | 'down'; latencyMs?: number; error?: string }> {
    const start = Date.now()
    try {
      await this.withTimeout(this.redis.ping(), this.CHECK_TIMEOUT_MS, 'Redis check timed out')
      const latencyMs = Date.now() - start
      return { status: 'up', latencyMs }
    } catch (error: any) {
      return { status: 'down', error: error.message }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), ms)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }
}
