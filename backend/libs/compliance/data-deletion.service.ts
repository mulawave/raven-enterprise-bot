import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

export interface CreateDeletionRequestDto {
  tenantId: string
  identifier: string
  identifierType: 'email' | 'phone'
  source?: 'manual' | 'customer_portal' | 'webhook'
}

export interface DeletionRequestResult {
  confirmationCode: string
  statusUrl: string
}

@Injectable()
export class DataDeletionService {
  constructor(private readonly prisma: PrismaClient) {}

  async createRequest(dto: CreateDeletionRequestDto, baseUrl: string): Promise<DeletionRequestResult> {
    if (!dto.identifier || !dto.identifierType) {
      throw new BadRequestException('identifier and identifierType are required')
    }

    // Check for an existing pending request for this identifier within this tenant
    const existing = await this.prisma.dataDeletionRequest.findFirst({
      where: {
        tenant_id: dto.tenantId,
        identifier: dto.identifier,
        status: 'pending',
      },
    })

    if (existing) {
      return {
        confirmationCode: existing.confirmation_code,
        statusUrl: `${baseUrl}/api/data-deletion/status/${existing.confirmation_code}`,
      }
    }

    const confirmationCode = randomBytes(16).toString('hex')

    await this.prisma.dataDeletionRequest.create({
      data: {
        tenant_id: dto.tenantId,
        confirmation_code: confirmationCode,
        identifier: dto.identifier,
        identifier_type: dto.identifierType,
        source: dto.source ?? 'manual',
        status: 'pending',
      },
    })

    return {
      confirmationCode,
      statusUrl: `${baseUrl}/api/data-deletion/status/${confirmationCode}`,
    }
  }

  async processRequest(id: string, tenantId: string): Promise<void> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id, tenant_id: tenantId },
    })

    if (!request) {
      throw new NotFoundException('Deletion request not found')
    }

    if (request.status === 'completed') {
      return // idempotent
    }

    // Find customer records matching the identifier
    const whereClause =
      request.identifier_type === 'email'
        ? { tenant_id: tenantId, email: request.identifier }
        : { tenant_id: tenantId, phone: request.identifier }

    const customers = await this.prisma.customer.findMany({ where: whereClause, select: { id: true } })

    for (const customer of customers) {
      // Cascade deletes messages → conversations → orders → bookings via FK onDelete Cascade
      // We only need to delete the customer record; DB cascades handle the rest
      await this.prisma.customer.delete({ where: { id: customer.id } })
    }

    await this.prisma.dataDeletionRequest.update({
      where: { id },
      data: {
        status: 'completed',
        completed_at: new Date(),
        notes: `Erased ${customers.length} customer record(s) matching ${request.identifier_type} "${request.identifier}"`,
      },
    })
  }

  async listRequests(tenantId: string) {
    return this.prisma.dataDeletionRequest.findMany({
      where: { tenant_id: tenantId },
      orderBy: { requested_at: 'desc' },
      take: 100,
      select: {
        id: true,
        confirmation_code: true,
        identifier: true,
        identifier_type: true,
        status: true,
        source: true,
        requested_at: true,
        completed_at: true,
        notes: true,
      },
    })
  }

  async getRequestByCode(confirmationCode: string) {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { confirmation_code: confirmationCode },
      select: {
        confirmation_code: true,
        status: true,
        requested_at: true,
        completed_at: true,
      },
    })

    if (!request) {
      throw new NotFoundException('Deletion request not found')
    }

    return request
  }
}
