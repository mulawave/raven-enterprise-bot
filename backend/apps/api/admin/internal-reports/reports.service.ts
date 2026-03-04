import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  async aiUsagePerTenant() {
    return this.prisma.auditLog.groupBy({
      by: ['tenant_id'],
      _count: { id: true },
      where: { action: { startsWith: 'AI_INTENT:' } },
    })
  }

  async messagingVolumePerChannel() {
    return this.prisma.message.groupBy({
      by: ['tenant_id', 'sender_type'],
      _count: { id: true },
    })
  }

  async paymentProcessingVolume() {
    return this.prisma.payment.groupBy({
      by: ['tenant_id'],
      _sum: { amount_kobo: true },
      _count: { id: true },
      where: { status: 'paid' },
    })
  }
}
