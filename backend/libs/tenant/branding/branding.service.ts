import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export type BrandingConfig = {
	name?: string
	logoUrl?: string
	theme?: string
}

@Injectable()
export class BrandingService {
	constructor(private readonly prisma: PrismaClient) {}

	async getBranding(tenantId: string): Promise<BrandingConfig> {
		const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
		return {
			name: tenant?.name,
			logoUrl: tenant?.logo_url ?? undefined,
			theme: tenant?.theme ?? undefined,
		}
	}

	async setBranding(tenantId: string, config: BrandingConfig): Promise<void> {
		await this.prisma.tenant.update({
			where: { id: tenantId },
			data: {
				name: config.name,
				logo_url: config.logoUrl,
				theme: config.theme,
			}
		})
	}
}
