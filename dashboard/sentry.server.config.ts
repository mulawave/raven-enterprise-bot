/**
 * Sentry server-side configuration for the dashboard.
 * No-ops when NEXT_PUBLIC_SENTRY_DSN is not set.
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  // Silently skip init when DSN is absent (local dev)
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
})
