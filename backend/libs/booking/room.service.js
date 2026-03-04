"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomTypeService = void 0;
class RoomTypeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRoomTypes(tenantId) {
        return this.prisma.roomType.findMany({
            where: { tenant_id: tenantId },
            orderBy: { name: 'asc' },
        });
    }
    async getRoomTypeById(tenantId, roomTypeId) {
        return this.prisma.roomType.findFirst({
            where: { tenant_id: tenantId, id: roomTypeId },
        });
    }
}
exports.RoomTypeService = RoomTypeService;
