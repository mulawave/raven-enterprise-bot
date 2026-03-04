/**
 * Sentry browser/client configuration for the dashboard.
 */
'use client'
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  // Replay captures 10 % of sessions and 100 % of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
})
