"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuspensionService = void 0;
class SuspensionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async suspendTenant(tenantId) {
        await this.prisma.tenant.update({ where: { id: tenantId }, data: { suspended: true } });
    }
    async unsuspendTenant(tenantId) {
        await this.prisma.tenant.update({ where: { id: tenantId }, data: { suspended: false } });
    }
    async isSuspended(tenantId) {
        const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
        return !!tenant?.suspended;
    }
    async autoReactivateOnPayment(tenantId) {
        const invoices = await this.prisma.invoice.findMany({ where: { tenant_id: tenantId, status: 'paid' } });
        if (invoices.length > 0) {
            await this.unsuspendTenant(tenantId);
        }
    }
}
exports.SuspensionService = SuspensionService;
