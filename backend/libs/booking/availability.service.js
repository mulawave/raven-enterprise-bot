"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
class AvailabilityService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async isRoomTypeAvailable(tenantId, roomTypeId, start, end) {
        const overlaps = await this.prisma.booking.findFirst({
            where: {
                tenant_id: tenantId,
                room_type_id: roomTypeId,
                status: { in: ['pending', 'confirmed'] },
                OR: [
                    { start_date: { lte: end }, end_date: { gte: start } },
                ],
            },
        });
        return !overlaps;
    }
    async getRoomTypes(tenantId) {
        return this.prisma.roomType.findMany({
            where: { tenant_id: tenantId },
            orderBy: { created_at: 'asc' },
        });
    }
}
exports.AvailabilityService = AvailabilityService;
