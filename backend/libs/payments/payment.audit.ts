import { PrismaClient, PaymentAudit } from '@prisma/client'

export class PaymentAuditLog {
  constructor(private readonly prisma: PrismaClient) {}

  async log(tenantId: string, paymentId: string, status: string, reference: string): Promise<PaymentAudit> {
    return this.prisma.paymentAudit.create({
      data: {
        tenant_id: tenantId,
        payment_id: paymentId,
        status,
        reference,
      },
    })
  }
}
