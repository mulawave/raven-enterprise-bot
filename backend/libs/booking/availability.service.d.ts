import { PrismaClient } from '@prisma/client';
export declare class AvailabilityService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    isRoomTypeAvailable(tenantId: string, roomTypeId: string, start: Date, end: Date): Promise<boolean>;
    getRoomTypes(tenantId: string): Promise<any[]>;
}
