import { Injectable } from '@nestjs/common'
import { PrismaClient, UserRole } from '@prisma/client'

@Injectable()
export class StaffScopeService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAssignedBranches(userId: string): Promise<string[]> {
    const mappings = await this.prisma.staffBranch.findMany({ where: { user_id: userId } })
    return mappings.map(m => m.branch_id)
  }

  async isBranchAssigned(userId: string, branchId: string): Promise<boolean> {
    const mapping = await this.prisma.staffBranch.findFirst({ where: { user_id: userId, branch_id: branchId } })
    return !!mapping
  }

  async canAccessBranch(user: { id: string; role: UserRole }, branchId: string): Promise<boolean> {
    if (user.role === 'owner') return true
    return this.isBranchAssigned(user.id, branchId)
  }
}
