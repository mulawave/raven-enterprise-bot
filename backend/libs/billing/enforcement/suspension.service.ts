import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class SuspensionService {
	constructor(private readonly prisma: PrismaClient) {}

	async suspendTenant(tenantId: string): Promise<void> {
		await this.prisma.tenant.update({ where: { id: tenantId }, data: { suspended: true } })
	}

	async unsuspendTenant(tenantId: string): Promise<void> {
		await this.prisma.tenant.update({ where: { id: tenantId }, data: { suspended: false } })
	}

	async isSuspended(tenantId: string): Promise<boolean> {
		const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
		return !!tenant?.suspended
	}

	async autoReactivateOnPayment(tenantId: string): Promise<void> {
		const paidPayments = await this.prisma.payment.findMany({
			where: { tenant_id: tenantId, status: 'paid' },
		})
		if (paidPayments.length > 0) {
			await this.unsuspendTenant(tenantId)
		}
	}
}
