import { Controller, Get, Post, Body, Param, Query, ForbiddenException, UseGuards } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { BookingService } from '../../../libs/booking/booking.service'
import { AvailabilityService } from '../../../libs/booking/availability.service'
import { RoomTypeService } from '../../../libs/booking/room.service'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'
import { JwtAuthGuard } from '../../../libs/auth/guards/jwt-auth.guard'
import { CurrentUser } from '../../../libs/auth/decorators/current-user.decorator'
import { StaffScopeService } from '../../../libs/auth/staff.scope.service'

@Controller('api/bookings')
export class BookingController {
  private readonly bookingService: BookingService
  private readonly availabilityService: AvailabilityService
  private readonly roomTypeService: RoomTypeService

  constructor(
    private readonly prisma: PrismaClient,
    private readonly staffScopeService: StaffScopeService,
  ) {
    const auditLogger = new AuditLogger(prisma)
    this.availabilityService = new AvailabilityService(prisma)
    this.bookingService = new BookingService(prisma, this.availabilityService, auditLogger)
    this.roomTypeService = new RoomTypeService(prisma)
  }

  @Get('room-types')
  async getRoomTypes(@Query('tenantId') tenantId: string) {
    return this.roomTypeService.getRoomTypes(tenantId)
  }

  @Get('availability')
  async checkAvailability(
    @Query('tenantId') tenantId: string,
    @Query('roomTypeId') roomTypeId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const available = await this.availabilityService.isRoomTypeAvailable(
      tenantId,
      roomTypeId,
      new Date(start),
      new Date(end),
    )
    return { available }
  }

  @Post()
  async createBooking(
    @Body()
    body: {
      tenantId: string
      branchId: string
      customerId: string
      roomTypeId: string
      start: string
      end: string
      totalKobo: number
    },
  ) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: body.branchId, tenant_id: body.tenantId },
    })
    if (!branch) {
      throw new ForbiddenException('Branch does not belong to tenant')
    }

    const roomType = await this.roomTypeService.getRoomTypeById(body.tenantId, body.roomTypeId)
    if (!roomType) {
      throw new ForbiddenException('Room type does not belong to tenant')
    }

    return this.bookingService.createBooking(
      body.tenantId,
      body.branchId,
      body.customerId,
      body.roomTypeId,
      new Date(body.start),
      new Date(body.end),
      body.totalKobo,
    )
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listBookings(@CurrentUser() user: any, @Query('branchId') branchId?: string) {
    const { tenantId, branchIds } = await this.resolveTenantBranchScope(user, branchId)
    return this.bookingService.listBookings(tenantId, branchIds)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getBooking(
    @CurrentUser() user: any,
    @Param('id') bookingId: string,
    @Query('branchId') branchId?: string,
  ) {
    const { tenantId, branchIds } = await this.resolveTenantBranchScope(user, branchId)
    return this.bookingService.getBooking(tenantId, bookingId, branchIds)
  }

  private async resolveTenantBranchScope(user: any, requestedBranchId?: string) {
    if (!user?.tenant_id || user.scope === 'SYSTEM') {
      throw new ForbiddenException('Tenant credentials required')
    }

    if (user.role === 'staff') {
      const assignedBranchIds = await this.staffScopeService.getAssignedBranches(user.id ?? user.sub)
      if (assignedBranchIds.length === 0) {
        throw new ForbiddenException('No branch access assigned')
      }
      if (requestedBranchId && !assignedBranchIds.includes(requestedBranchId)) {
        throw new ForbiddenException('Branch access denied')
      }
      return {
        tenantId: user.tenant_id,
        branchIds: requestedBranchId ? [requestedBranchId] : assignedBranchIds,
      }
    }

    if (requestedBranchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: requestedBranchId, tenant_id: user.tenant_id },
      })
      if (!branch) {
        throw new ForbiddenException('Branch access denied')
      }
      return { tenantId: user.tenant_id, branchIds: [requestedBranchId] }
    }

    return { tenantId: user.tenant_id, branchIds: undefined as string[] | undefined }
  }
}
