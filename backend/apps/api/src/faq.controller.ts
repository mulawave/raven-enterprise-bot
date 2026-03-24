import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
  NotFoundException, ForbiddenException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('api/faqs')
@UseGuards(JwtAuthGuard)
export class FaqController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.prisma.tenantFaq.findMany({
      where: { tenant_id: user.tenant_id },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    })
  }

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() body: { question: string; answer: string; sort_order?: number },
  ) {
    if (!body?.question?.trim()) throw new ForbiddenException('question is required')
    if (!body?.answer?.trim()) throw new ForbiddenException('answer is required')

    return this.prisma.tenantFaq.create({
      data: {
        tenant_id: user.tenant_id,
        question: body.question.trim(),
        answer: body.answer.trim(),
        sort_order: body.sort_order ?? 0,
      },
    })
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { question?: string; answer?: string; sort_order?: number },
  ) {
    const existing = await this.prisma.tenantFaq.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!existing) throw new NotFoundException('FAQ not found')

    return this.prisma.tenantFaq.update({
      where: { id },
      data: {
        ...(body.question !== undefined ? { question: body.question.trim() } : {}),
        ...(body.answer !== undefined ? { answer: body.answer.trim() } : {}),
        ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
      },
    })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const existing = await this.prisma.tenantFaq.findFirst({
      where: { id, tenant_id: user.tenant_id },
    })
    if (!existing) throw new NotFoundException('FAQ not found')
    await this.prisma.tenantFaq.delete({ where: { id } })
  }
}
