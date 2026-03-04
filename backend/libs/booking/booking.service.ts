import { PrismaClient, Booking } from '@prisma/client'
import { AvailabilityService } from './availability.service'
import { AuditLogger } from '../monitoring/audit.logger'

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export class BookingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly availability: AvailabilityService,
    private readonly auditLogger: AuditLogger,
  ) {}

  async createBooking(
    tenantId: string,
    branchId: string,
    customerId: string,
    roomTypeId: string,
    start: Date,
    end: Date,
    totalKobo: number,
  ): Promise<Booking> {
    const available = await this.availability.isRoomTypeAvailable(tenantId, roomTypeId, start, end)
    if (!available) {
      throw new Error('BOOKING_ROOM_UNAVAILABLE')
    }

    if (start >= end) {
      throw new Error('BOOKING_INVALID_DATES')
    }

    const booking = await this.prisma.booking.create({
      data: {
        tenant_id: tenantId,
        branch_id: branchId,
        customer_id: customerId,
        room_type_id: roomTypeId,
        start_date: start,
        end_date: end,
        total_kobo: totalKobo,
        status: 'pending' as string,
      },
    })

    await this.auditLogger.log({
      tenant_id: tenantId,
      entity_id: booking.id,
      action: 'BOOKING_CREATED',
      timestamp: new Date(),
    })

    return booking
  }

  async getBooking(tenantId: string, branchId: string, bookingId: string): Promise<Booking | null> {
    return this.prisma.booking.findFirst({
      where: { id: bookingId, tenant_id: tenantId, branch_id: branchId },
      include: { customer: true, roomType: true },
    })
  }

  async listBookings(tenantId: string, branchId: string): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: { tenant_id: tenantId, branch_id: branchId },
      include: { customer: true, roomType: true },
      orderBy: { created_at: 'desc' },
    })
  }

  async updateStatus(tenantId: string, bookingId: string, status: BookingStatus): Promise<Booking> {
    const booking = await this.prisma.booking.update({
      where: { id: bookingId, tenant_id: tenantId },
      data: { status },
    })

    await this.auditLogger.log({
      tenant_id: tenantId,
      entity_id: bookingId,
      action: `BOOKING_STATUS_${status.toUpperCase()}`,
      timestamp: new Date(),
    })

    return booking
  }
}
