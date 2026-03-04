export const CACHE_PREFIX = 'cache'

export function menuItemsKey(tenantId: string) {
  return `${CACHE_PREFIX}:menu:${tenantId}`
}

export function roomTypesKey(tenantId: string) {
  return `${CACHE_PREFIX}:rooms:${tenantId}`
}

export function brandingKey(tenantId: string) {
  return `${CACHE_PREFIX}:branding:${tenantId}`
}

export function featureFlagsKey(tenantId: string) {
  return `${CACHE_PREFIX}:flags:${tenantId}`
}
