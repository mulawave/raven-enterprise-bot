/**
 * Sentry backend initialisation — loaded once at process start.
 * No-ops when SENTRY_DSN is not set (local dev / CI without DSN).
 */
import * as Sentry from '@sentry/node'

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // Capture unhandled promise rejections
    integrations: [Sentry.onUncaughtExceptionIntegration(), Sentry.onUnhandledRejectionIntegration()],
  })
}
