"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandingService = void 0;
class BrandingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBranding(tenantId) {
        const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
        return {
            name: tenant?.name,
            logoUrl: tenant?.logo_url,
            theme: tenant?.theme,
        };
    }
    async setBranding(tenantId, config) {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                name: config.name,
                logo_url: config.logoUrl,
                theme: config.theme,
            }
        });
    }
}
exports.BrandingService = BrandingService;
