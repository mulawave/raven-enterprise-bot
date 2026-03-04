import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class ResellerService {
  private readonly logger = new Logger(ResellerService.name)

  constructor(private readonly prisma: PrismaClient) {}

  async create(name: string, email: string) {
    const existing = await this.prisma.resellerAccount.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException(`A reseller with email '${email}' already exists`)
    }
    const reseller = await this.prisma.resellerAccount.create({
      data: { name, email },
    })
    this.logger.log(`Reseller created: ${reseller.id} (${email})`)
    return reseller
  }

  async list(page: number, pageSize: number) {
    const skip = (page - 1) * pageSize
    const [resellers, total] = await Promise.all([
      this.prisma.resellerAccount.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        include: { _count: { select: { tenantAssignments: true } } },
      }),
      this.prisma.resellerAccount.count(),
    ])
    return { resellers, total, page, pageSize }
  }

  async findOne(id: string) {
    const reseller = await this.prisma.resellerAccount.findUnique({
      where: { id },
      include: {
        tenantAssignments: {
          include: { tenant: { select: { id: true, name: true } } },
          orderBy: { assigned_at: 'desc' },
        },
      },
    })
    if (!reseller) throw new NotFoundException(`Reseller '${id}' not found`)
    return reseller
  }

  async remove(id: string) {
    await this.findOne(id) // throws 404 if missing
    await this.prisma.resellerAccount.delete({ where: { id } })
    this.logger.log(`Reseller deleted: ${id}`)
  }

  async assignTenant(resellerId: string, tenantId: string) {
    await this.findOne(resellerId) // 404 guard

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) throw new NotFoundException(`Tenant '${tenantId}' not found`)

    const existing = await this.prisma.tenantAssignment.findUnique({
      where: { reseller_id_tenant_id: { reseller_id: resellerId, tenant_id: tenantId } },
    })
    if (existing) throw new ConflictException('Tenant is already assigned to this reseller')

    const assignment = await this.prisma.tenantAssignment.create({
      data: { reseller_id: resellerId, tenant_id: tenantId },
      include: { tenant: { select: { id: true, name: true } } },
    })
    this.logger.log(`Tenant ${tenantId} assigned to reseller ${resellerId}`)
    return assignment
  }

  async unassignTenant(resellerId: string, tenantId: string) {
    const assignment = await this.prisma.tenantAssignment.findUnique({
      where: { reseller_id_tenant_id: { reseller_id: resellerId, tenant_id: tenantId } },
    })
    if (!assignment) throw new NotFoundException('Assignment not found')

    await this.prisma.tenantAssignment.delete({
      where: { reseller_id_tenant_id: { reseller_id: resellerId, tenant_id: tenantId } },
    })
    this.logger.log(`Tenant ${tenantId} unassigned from reseller ${resellerId}`)
  }
}
