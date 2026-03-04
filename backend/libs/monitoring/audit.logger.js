"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
class AuditLogger {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(entry) {
        await this.prisma.auditLog.create({
            data: {
                tenant_id: entry.tenant_id,
                entity_id: entry.entity_id,
                action: entry.action,
                timestamp: entry.timestamp,
            },
        });
    }
}
exports.AuditLogger = AuditLogger;
