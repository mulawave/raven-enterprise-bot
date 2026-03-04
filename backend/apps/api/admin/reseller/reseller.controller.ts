import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../../libs/auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from '../../../../libs/auth/guards/super-admin.guard'
import { ResellerService } from './reseller.service'

interface CreateResellerDto {
  name: string
  email: string
}

interface AssignTenantDto {
  tenantId: string
}

@Controller('admin/resellers')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class ResellerController {
  constructor(private readonly resellerService: ResellerService) {}

  /**
   * POST /admin/resellers
   * Create a new reseller account
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateResellerDto) {
    const { name, email } = body
    if (!name || !email) {
      throw new BadRequestException('name and email are required')
    }
    return this.resellerService.create(name, email)
  }

  /**
   * GET /admin/resellers
   * List all reseller accounts with tenant assignment counts
   */
  @Get()
  async list(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50))
    return this.resellerService.list(pageNum, pageSizeNum)
  }

  /**
   * GET /admin/resellers/:id
   * Get one reseller with their full tenant assignment list
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.resellerService.findOne(id)
  }

  /**
   * DELETE /admin/resellers/:id
   * Delete a reseller account (cascades TenantAssignment rows via schema onDelete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.resellerService.remove(id)
  }

  /**
   * POST /admin/resellers/:id/tenants
   * Assign a tenant to this reseller
   */
  @Post(':id/tenants')
  @HttpCode(HttpStatus.CREATED)
  async assignTenant(@Param('id') id: string, @Body() body: AssignTenantDto) {
    if (!body.tenantId) {
      throw new BadRequestException('tenantId is required')
    }
    return this.resellerService.assignTenant(id, body.tenantId)
  }

  /**
   * DELETE /admin/resellers/:id/tenants/:tenantId
   * Remove a tenant assignment from this reseller
   */
  @Delete(':id/tenants/:tenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignTenant(@Param('id') id: string, @Param('tenantId') tenantId: string) {
    await this.resellerService.unassignTenant(id, tenantId)
  }
}
