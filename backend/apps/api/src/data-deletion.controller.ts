import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { DataDeletionService } from '../../../libs/compliance/data-deletion.service'

interface SubmitRequestDto {
  identifier: string
  identifierType: 'email' | 'phone'
  tenantId?: string // optional override; for customer portal submissions
}

@Controller()
export class DataDeletionController {
  constructor(
    private readonly deletionService: DataDeletionService,
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * POST /api/data-deletion/public
   * Public: end customers submit their own deletion request via the customer portal.
   * Requires tenantId so requests are scoped to the correct tenant.
   */
  @Post('api/data-deletion/public')
  @HttpCode(HttpStatus.CREATED)
  async publicRequest(@Body() body: SubmitRequestDto & { tenantId: string }, @Req() req: Request) {
    if (!body.tenantId || typeof body.tenantId !== 'string') {
      throw new UnauthorizedException('tenantId is required')
    }
    if (!body.identifier || typeof body.identifier !== 'string' || body.identifier.trim().length === 0) {
      throw new UnauthorizedException('identifier is required')
    }
    if (body.identifierType !== 'email' && body.identifierType !== 'phone') {
      throw new UnauthorizedException('identifierType must be email or phone')
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: body.tenantId }, select: { id: true } })
    if (!tenant) {
      throw new UnauthorizedException('Invalid tenantId')
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`
    return this.deletionService.createRequest(
      { tenantId: body.tenantId, identifier: body.identifier.trim(), identifierType: body.identifierType, source: 'customer_portal' },
      baseUrl,
    )
  }

  /**
   * POST /api/data-deletion
   * Authenticated: tenant staff submits a deletion request for a customer identifier.
   */
  @Post('api/data-deletion')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRequest(@Body() body: SubmitRequestDto, @CurrentUser() user: any, @Req() req: Request) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')

    const baseUrl = `${req.protocol}://${req.get('host')}`
    return this.deletionService.createRequest(
      { tenantId, identifier: body.identifier, identifierType: body.identifierType, source: 'manual' },
      baseUrl,
    )
  }

  /**
   * GET /api/data-deletion
   * Authenticated: list all deletion requests for the current tenant.
   */
  @Get('api/data-deletion')
  @UseGuards(JwtAuthGuard)
  async listRequests(@CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')

    return this.deletionService.listRequests(tenantId)
  }

  /**
   * POST /api/data-deletion/:id/process
   * Authenticated: execute the erasure for a pending request.
   */
  @Post('api/data-deletion/:id/process')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async processRequest(@Param('id') id: string, @CurrentUser() user: any) {
    const tenantId = user?.tenant_id
    if (!tenantId) throw new UnauthorizedException('Tenant credentials required')

    await this.deletionService.processRequest(id, tenantId)
    return { message: 'Data deletion completed' }
  }

  /**
   * GET /api/data-deletion/status/:confirmationCode
   * Public: allows a customer (or Meta's verification check) to confirm deletion status.
   */
  @Get('api/data-deletion/status/:confirmationCode')
  async getStatus(@Param('confirmationCode') confirmationCode: string) {
    return this.deletionService.getRequestByCode(confirmationCode)
  }

  /**
   * POST /webhooks/data-deletion
   * Public webhook — Meta/Facebook data deletion callback.
   *
   * Meta sends a signed_request and expects back:
   *   { url: <status_url>, confirmation_code: <code> }
   *
   * The signed_request payload contains: { user_id, issued_at, algorithm }
   * We match user_id to customers via their phone (WhatsApp ID format) and queue erasure.
   */
  @Post('webhooks/data-deletion')
  @HttpCode(HttpStatus.OK)
  async metaWebhook(@Body() body: Record<string, string>, @Req() req: Request) {
    const signedRequest: string = body?.signed_request ?? ''
    if (!signedRequest) {
      return { url: '', confirmation_code: '' }
    }

    // Decode the signed_request (two Base64URL parts separated by '.')
    const parts = signedRequest.split('.')
    if (parts.length !== 2) {
      return { url: '', confirmation_code: '' }
    }

    let payload: Record<string, unknown>
    try {
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'))
    } catch {
      return { url: '', confirmation_code: '' }
    }

    const userId = typeof payload.user_id === 'string' ? payload.user_id : null
    if (!userId) {
      return { url: '', confirmation_code: '' }
    }

    // Find customers across all tenants that match this identifier (phone = Meta user_id)
    const customers = await this.prisma.customer.findMany({
      where: { phone: userId },
      select: { id: true, tenant_id: true },
    })

    const baseUrl = `${req.protocol}://${req.get('host')}`
    let confirmationCode = ''

    if (customers.length === 0) {
      // No customer found — nothing to erase. Return a stable synthetic code so Meta
      // accepts the response without retrying. Use the hashed userId as the code.
      const { createHash } = await import('crypto')
      confirmationCode = createHash('sha256').update(userId).digest('hex').slice(0, 32)
    } else {
      // Create deletion requests for all matching tenants; return the first code
      for (const customer of customers) {
        const result = await this.deletionService.createRequest(
          { tenantId: customer.tenant_id, identifier: userId, identifierType: 'phone', source: 'webhook' },
          baseUrl,
        ).catch(() => null)
        if (!confirmationCode && result) confirmationCode = result.confirmationCode
      }
    }

    const statusUrl = `${baseUrl}/api/data-deletion/status/${confirmationCode}`
    return { url: statusUrl, confirmation_code: confirmationCode }
  }
}
