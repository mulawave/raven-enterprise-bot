import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
  NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('api/contacts')
@UseGuards(JwtAuthGuard)
export class ContactController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * GET /api/contacts
   * Returns contacts with their latest conversation status.
   */
  @Get()
  async list(@CurrentUser() user: any) {
    const tenantId: string = user.tenant_id

    const [contacts, customers] = await Promise.all([
      this.prisma.contact.findMany({
        where: { tenant_id: tenantId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.findMany({
        where: { tenant_id: tenantId, phone: { not: null } },
        select: {
          phone: true,
          conversations: {
            where: { tenant_id: tenantId },
            orderBy: { updated_at: 'desc' },
            take: 1,
            select: { id: true, status: true },
          },
        },
      }),
    ])

    const phoneToConv = new Map<string, { id: string; status: string }>()
    for (const customer of customers) {
      if (customer.phone && customer.conversations.length > 0) {
        phoneToConv.set(customer.phone, customer.conversations[0])
      }
    }

    return contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      notes: c.notes ?? null,
      createdAt: c.created_at.toISOString(),
      conversation: phoneToConv.get(c.phone) ?? null,
    }))
  }

  /**
   * POST /api/contacts
   * Body: { name, phone, notes? }
   */
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() body: { name: string; phone: string; notes?: string },
  ) {
    if (!body?.name?.trim()) throw new BadRequestException('name is required')
    if (!body?.phone?.trim()) throw new BadRequestException('phone is required')

    const existing = await this.prisma.contact.findFirst({
      where: { tenant_id: user.tenant_id, phone: body.phone.trim() },
    })
    if (existing) throw new ConflictException('A contact with this phone number already exists')

    return this.prisma.contact.create({
      data: {
        tenant_id: user.tenant_id,
        name: body.name.trim(),
        phone: body.phone.trim(),
        notes: body.notes?.trim() ?? null,
      },
    })
  }

  /**
   * PATCH /api/contacts/:id
   * Body: { name?, notes? }
   */
  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { name?: string; notes?: string },
  ) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!existing) throw new NotFoundException('Contact not found')

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
      },
    })
  }

  /**
   * DELETE /api/contacts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!existing) throw new NotFoundException('Contact not found')
    await this.prisma.contact.delete({ where: { id } })
  }
}
