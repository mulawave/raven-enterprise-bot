import { Injectable } from '@nestjs/common'
import { PrismaClient, Prisma } from '@prisma/client'

/** Models that support tenant-scoped data purge */
export type PurgeableModel = 'auditLog' | 'message' | 'conversation' | 'order' | 'booking' | 'payment'

type DeleteManyDelegate = {
  deleteMany(args: { where: Record<string, unknown> }): Prisma.PrismaPromise<Prisma.BatchPayload>
}

@Injectable()
export class DataRetentionService {
  constructor(private readonly prisma: PrismaClient) {}

  async purgeOldRecords(tenantId: string, model: PurgeableModel, days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const delegates: Record<PurgeableModel, DeleteManyDelegate> = {
      auditLog: this.prisma.auditLog as unknown as DeleteManyDelegate,
      message: this.prisma.message as unknown as DeleteManyDelegate,
      conversation: this.prisma.conversation as unknown as DeleteManyDelegate,
      order: this.prisma.order as unknown as DeleteManyDelegate,
      booking: this.prisma.booking as unknown as DeleteManyDelegate,
      payment: this.prisma.payment as unknown as DeleteManyDelegate,
    }
    const result = await delegates[model].deleteMany({
      where: { tenant_id: tenantId, created_at: { lt: cutoff } },
    })
    return result.count
  }
}
