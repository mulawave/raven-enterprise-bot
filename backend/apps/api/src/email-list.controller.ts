import { Controller, Get, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'

@Controller('api/email-list')
@UseGuards(JwtAuthGuard)
export class EmailListController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.prisma.emailList.findMany({
      where: { tenant_id: user.tenant_id },
      orderBy: { created_at: 'desc' },
    })
  }
}
