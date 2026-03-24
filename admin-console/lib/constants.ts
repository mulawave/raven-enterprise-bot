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

export const ADMIN_TOKEN_KEY = 'raven_admin_token'

export const ROUTES = {
  LOGIN: '/admin/login',
  OVERVIEW: '/admin',
  TENANTS: '/admin/tenants',
  SUBSCRIPTIONS: '/admin/subscriptions',
  PLANS: '/admin/plans',
  BILLING: '/admin/billing',
  ADMIN_USERS: '/admin/users',
  OPS: '/admin/ops',
  ORDERS: '/admin/orders',
  BOOKINGS: '/admin/bookings',
  CUSTOMERS: '/admin/customers',
  SYSTEM: '/admin/system',
  USERS: '/admin/users',
  RESET: '/admin/reset',
  PROFILE: '/admin/profile',
  SETTINGS: '/admin/settings',
  API_KEYS: '/admin/api-keys',
  PAYMENT_CONFIG: '/admin/payment-config',
  EMAIL_CONFIG: '/admin/email-config',
  NOTIFICATIONS: '/admin/notifications',
} as const

export const API_ENDPOINTS = {
  AUTH_LOGIN: '/admin/auth/login',
  AUTH_ME: '/admin/auth/me',
  REVENUE_SUMMARY: '/admin/billing/revenue/summary',
  BILLING_PAYMENTS: '/admin/billing/payments',
  SYSTEM_HEALTH: '/admin/system/health',
  OPS_MESSAGING_STATS: '/admin/ops/messaging/stats',
  OPS_AI_HEALTH: '/admin/ops/ai/health',
  OPS_QUEUES_HEALTH: '/admin/ops/queues/health',
  TENANTS: '/admin/tenants',
  SUBSCRIPTIONS: '/admin/subscriptions',
  PLANS: '/admin/subscriptions/plans',
  ORDERS: '/admin/ops/orders/stats',
  ORDERS_LIST: '/admin/orders',
  CUSTOMERS_LIST: '/admin/customers',
  BROADCAST: '/admin/notifications/broadcast',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_NOTIFICATIONS_READ_ALL: '/admin/notifications/read-all',
  BOOKINGS: '/admin/ops/bookings/stats',
  ADMIN_USERS: '/admin/users',
  CONFIG_KEYS: '/admin/config/keys',
  CONFIG_EMAIL_TEMPLATES: '/admin/config/email/templates',
  CONFIG_EMAIL_TEST: '/admin/config/email/test',
  TENANT_RESET: (id: string) => `/admin/tenants/${id}/reset`,
  TENANT_BACKUP: (id: string) => `/admin/tenants/${id}/backup`,
  TENANT_RESTORE: (id: string) => `/admin/tenants/${id}/restore`,
  PLATFORM_RESET_STATS: '/admin/reset/stats',
  PLATFORM_RESET_BACKUP: '/admin/reset/backup',
  PLATFORM_RESET: '/admin/reset',
  PLATFORM_RESTORE: '/admin/reset/restore',
  PLATFORM_RESET_CONFIG: '/admin/reset/config',
} as const
