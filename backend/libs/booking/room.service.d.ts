import { PrismaClient } from '@prisma/client';
export declare class RoomTypeService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getRoomTypes(tenantId: string): Promise<{
        name: string;
        id: string;
        tenant_id: string;
        created_at: Date;
        price_kobo: number;
        updated_at: Date;
    }[]>;
    getRoomTypeById(tenantId: string, roomTypeId: string): Promise<{
        name: string;
        id: string;
        tenant_id: string;
        created_at: Date;
        price_kobo: number;
        updated_at: Date;
    } | null>;
}
