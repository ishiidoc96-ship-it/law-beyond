// Sentry configuration for error tracking and performance monitoring
import * as Sentry from '@sentry/react'

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    console.log('[Sentry] DSN not configured, skipping initialization')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || '0.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    beforeSend(event, hint) {
      // Filter out non-critical errors
      if (event.exception) {
        const error = hint.originalException
        if (error instanceof Error) {
          // Ignore network errors that are likely user connectivity issues
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            return null
          }
          // Ignore AbortError from cancelled requests
          if (error.name === 'AbortError') {
            return null
          }
        }
      }
      return event
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  })

  console.log('[Sentry] Initialized')
}

export { Sentry }