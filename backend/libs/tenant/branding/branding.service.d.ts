import { PrismaClient } from '@prisma/client';
export type BrandingConfig = {
    name?: string;
    logoUrl?: string;
    theme?: string;
};
export declare class BrandingService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getBranding(tenantId: string): Promise<BrandingConfig>;
    setBranding(tenantId: string, config: BrandingConfig): Promise<void>;
}
