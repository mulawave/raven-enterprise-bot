import { PrismaClient } from '@prisma/client';
export interface AuditLogEntry {
    tenant_id: string;
    entity_id: string;
    action: string;
    timestamp: Date;
}
export declare class AuditLogger {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    log(entry: AuditLogEntry): Promise<void>;
}
