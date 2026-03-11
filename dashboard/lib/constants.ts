// Hardcoded tenant for development
export const TENANT_ID = "test-tenant-1"

const DEFAULT_DEV_API_URL = 'http://localhost:4000'
const DEFAULT_PROD_API_URL = 'https://api.raven-ai.online'

function isLocalApiUrl(url?: string): boolean {
	return !!url && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)
}

function isLocalHostname(hostname: string): boolean {
	return hostname === 'localhost' || hostname === '127.0.0.1'
}

function isRavenPublicHostname(hostname: string): boolean {
	return hostname === 'raven-ai.online' || hostname.endsWith('.raven-ai.online')
}

function resolveApiBaseUrl(): string {
	const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

	if (typeof window !== 'undefined') {
		const hostname = window.location.hostname

		if (isRavenPublicHostname(hostname) && isLocalApiUrl(envApiUrl)) {
			return DEFAULT_PROD_API_URL
		}

		if (envApiUrl) {
			return envApiUrl
		}

		return isLocalHostname(hostname) ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL
	}

	if (process.env.NODE_ENV === 'production' && (!envApiUrl || isLocalApiUrl(envApiUrl))) {
		return DEFAULT_PROD_API_URL
	}

	return envApiUrl || DEFAULT_DEV_API_URL
}

export const API_BASE_URL = resolveApiBaseUrl()
