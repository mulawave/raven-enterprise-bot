import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export type BrandingConfig = {
	name?: string
	logoUrl?: string
	primaryColor?: string
	whatsappNumber?: string
	theme?: string
}

@Injectable()
export class BrandingService {
	constructor(private readonly prisma: PrismaClient) {}

	async getBranding(tenantId: string): Promise<BrandingConfig> {
		const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
		let primaryColor: string | undefined
		let whatsappNumber: string | undefined
		try {
			if (tenant?.theme) {
				const parsed = JSON.parse(tenant.theme) as Record<string, unknown>
				primaryColor = typeof parsed.primaryColor === 'string' ? parsed.primaryColor : undefined
				whatsappNumber = typeof parsed.whatsappNumber === 'string' ? parsed.whatsappNumber : undefined
			}
		} catch { /* ignore invalid JSON */ }
		return {
			name: tenant?.name,
			logoUrl: tenant?.logo_url ?? undefined,
			primaryColor,
			whatsappNumber,
			theme: tenant?.theme ?? undefined,
		}
	}

	async setBranding(tenantId: string, config: BrandingConfig): Promise<void> {
		// Read existing theme so we only overwrite provided fields
		const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } })
		let existingTheme: Record<string, unknown> = {}
		try {
			if (tenant?.theme) existingTheme = JSON.parse(tenant.theme) as Record<string, unknown>
		} catch { /* ignore invalid JSON */ }

		const newTheme: Record<string, unknown> = { ...existingTheme }
		if (config.primaryColor !== undefined) newTheme.primaryColor = config.primaryColor
		if (config.whatsappNumber !== undefined) newTheme.whatsappNumber = config.whatsappNumber

		await this.prisma.tenant.update({
			where: { id: tenantId },
			data: {
				...(config.name !== undefined ? { name: config.name } : {}),
				...(config.logoUrl !== undefined ? { logo_url: config.logoUrl } : {}),
				theme: JSON.stringify(newTheme),
			},
		})
	}
}
