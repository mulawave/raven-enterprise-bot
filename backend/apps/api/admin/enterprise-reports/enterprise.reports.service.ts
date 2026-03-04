import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class EnterpriseReportsService {
  constructor(private readonly prisma: PrismaClient) {}

  async exportConversations(tenantId: string, page = 1, pageSize = 100) {
    const skip = (page - 1) * pageSize
    return this.prisma.conversation.findMany({
      where: { tenant_id: tenantId },
      include: { messages: true },
      skip,
      take: pageSize,
      orderBy: { updated_at: 'desc' },
    })
  }

  async revenueByBranch(tenantId: string, page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize
    return this.prisma.order.groupBy({
      by: ['branch_id'],
      where: { tenant_id: tenantId, status: 'paid' },
      _sum: { total_kobo: true },
      _count: { id: true },
      orderBy: { branch_id: 'asc' },
      skip,
      take: pageSize,
    })
  }

  async slaCompliance(tenantId: string, page = 1, pageSize = 100) {
    const skip = (page - 1) * pageSize
    return this.prisma.slaLog.findMany({
      where: { tenant_id: tenantId },
      skip,
      take: pageSize,
      orderBy: { timestamp: 'desc' },
    })
  }
}
