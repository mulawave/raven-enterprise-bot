export interface GeneratedModelDelegate {
	create(args: unknown): Promise<any>
	findMany(args?: unknown): Promise<any[]>
	findUnique(args: unknown): Promise<any | null>
	findFirst(args?: unknown): Promise<any | null>
	update(args: unknown): Promise<any>
	updateMany(args: unknown): Promise<any>
	delete(args: unknown): Promise<any>
	count(args?: unknown): Promise<number>
}

export interface GeneratedPrismaClient {
	license: GeneratedModelDelegate
	licenseActivation: GeneratedModelDelegate
	activationAttempt: GeneratedModelDelegate
	instanceActivation: GeneratedModelDelegate
}

export interface GeneratedLicenseActivation {
	id?: string
	domain: string
	status: string
}
