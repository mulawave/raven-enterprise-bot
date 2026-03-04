"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
class BookingService {
    constructor(prisma, availability, auditLogger) {
        this.prisma = prisma;
        this.availability = availability;
        this.auditLogger = auditLogger;
    }
    async createBooking(tenantId, branchId, customerId, roomTypeId, start, end, totalKobo) {
        const available = await this.availability.isRoomTypeAvailable(tenantId, roomTypeId, start, end);
        if (!available) {
            throw new Error('BOOKING_ROOM_UNAVAILABLE');
        }
        if (start >= end) {
            throw new Error('BOOKING_INVALID_DATES');
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
                status: 'pending',
            },
        });
        await this.auditLogger.log({
            tenant_id: tenantId,
            entity_id: booking.id,
            action: 'BOOKING_CREATED',
            timestamp: new Date(),
        });
        return booking;
    }
    async getBooking(tenantId, branchId, bookingId) {
        return this.prisma.booking.findFirst({
            where: { id: bookingId, tenant_id: tenantId, branch_id: branchId },
            include: { customer: true, roomType: true },
        });
    }
    async listBookings(tenantId, branchId) {
        return this.prisma.booking.findMany({
            where: { tenant_id: tenantId, branch_id: branchId },
            include: { customer: true, roomType: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async updateStatus(tenantId, bookingId, status) {
        const booking = await this.prisma.booking.update({
            where: { id: bookingId, tenant_id: tenantId },
            data: { status },
        });
        await this.auditLogger.log({
            tenant_id: tenantId,
            entity_id: bookingId,
            action: `BOOKING_STATUS_${status.toUpperCase()}`,
            timestamp: new Date(),
        });
        return booking;
    }
}
exports.BookingService = BookingService;
