import { Injectable } from '@nestjs/common'
import { PrismaClient, Branch } from '@prisma/client'

@Injectable()
export class BranchService {
	constructor(private readonly prisma: PrismaClient) {}

	async createBranch(tenantId: string, name: string): Promise<Branch> {
		return this.prisma.branch.create({
			data: { tenant_id: tenantId, name },
		})
	}

	async getBranches(tenantId: string): Promise<Branch[]> {
		return this.prisma.branch.findMany({ where: { tenant_id: tenantId } })
	}

	async getBranch(tenantId: string, branchId: string): Promise<Branch | null> {
		return this.prisma.branch.findFirst({ where: { id: branchId, tenant_id: tenantId } })
	}

	async updateBranch(tenantId: string, branchId: string, name: string): Promise<Branch> {
		return this.prisma.branch.update({ where: { id: branchId, tenant_id: tenantId }, data: { name } })
	}

	async deleteBranch(tenantId: string, branchId: string): Promise<Branch> {
		return this.prisma.branch.delete({ where: { id: branchId, tenant_id: tenantId } })
	}

	async getOrCreateDefaultBranch(tenantId: string): Promise<Branch> {
		let branch = await this.prisma.branch.findFirst({ where: { tenant_id: tenantId, name: 'Default' } })
		if (!branch) {
			branch = await this.createBranch(tenantId, 'Default')
		}
		return branch
	}
}
