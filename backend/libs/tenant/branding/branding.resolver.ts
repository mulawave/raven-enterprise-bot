import { BrandingService } from './branding.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const brandingService = new BrandingService(prisma)

export async function resolveBranding(tenantId: string) {
	return brandingService.getBranding(tenantId)
}
