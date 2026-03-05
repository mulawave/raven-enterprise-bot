export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

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
  PROFILE: '/admin/profile',
  SETTINGS: '/admin/settings',
  API_KEYS: '/admin/api-keys',
  PAYMENT_CONFIG: '/admin/payment-config',
  EMAIL_CONFIG: '/admin/email-config',
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
  BOOKINGS: '/admin/ops/bookings/stats',
  ADMIN_USERS: '/admin/users',
  CONFIG_KEYS: '/admin/config/keys',
  CONFIG_EMAIL_TEMPLATES: '/admin/config/email/templates',
  CONFIG_EMAIL_TEST: '/admin/config/email/test',
} as const
