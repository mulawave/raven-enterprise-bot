import { PrismaClient } from '@prisma/client';
export declare class SuspensionService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    suspendTenant(tenantId: string): Promise<void>;
    unsuspendTenant(tenantId: string): Promise<void>;
    isSuspended(tenantId: string): Promise<boolean>;
    autoReactivateOnPayment(tenantId: string): Promise<void>;
}
