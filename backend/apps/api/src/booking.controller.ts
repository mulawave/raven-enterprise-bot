import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { BookingService } from '../../../libs/booking/booking.service'
import { AvailabilityService } from '../../../libs/booking/availability.service'
import { RoomTypeService } from '../../../libs/booking/room.service'
import { AuditLogger } from '../../../libs/monitoring/audit.logger'

@Controller('api/bookings')
export class BookingController {
  private readonly bookingService: BookingService
  private readonly availabilityService: AvailabilityService
  private readonly roomTypeService: RoomTypeService

  constructor(private readonly prisma: PrismaClient) {
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
  async listBookings(@Query('tenantId') tenantId: string, @Query('branchId') branchId: string) {
    return this.bookingService.listBookings(tenantId, branchId)
  }

  @Get(':id')
  async getBooking(
    @Param('id') bookingId: string,
    @Query('tenantId') tenantId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.bookingService.getBooking(tenantId, branchId, bookingId)
  }
}
