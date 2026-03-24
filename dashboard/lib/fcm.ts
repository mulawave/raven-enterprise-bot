/**
 * Firebase client SDK initialisation + FCM token management.
 *
 * Config is loaded at runtime from /api/config/public (served from the DB
 * SystemConfig table) — never from NEXT_PUBLIC_* env vars.  All Firebase
 * client config is by design publicly safe (security is enforced by Firebase
 * Security Rules, not by keeping these values secret).
 */
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging'

export interface FirebaseClientConfig {
  apiKey: string
  authDomain: string
  projectId: string
  messagingSenderId: string
  appId: string
  vapidKey: string
}

function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:4010'
    return 'https://api.raven-ai.online'
  }
  return 'https://api.raven-ai.online'
}

let _configCache: FirebaseClientConfig | null = null
let _configFetch: Promise<FirebaseClientConfig | null> | null = null

/** Fetch Firebase client config from the DB, deduplicating concurrent calls. */
export async function getFirebaseConfig(): Promise<FirebaseClientConfig | null> {
  if (_configCache) return _configCache
  if (_configFetch) return _configFetch

  _configFetch = (async () => {
    try {
      const res = await fetch(`${resolveApiBase()}/api/config/public`)
      if (!res.ok) return null
      const data = await res.json()
      const config: FirebaseClientConfig = {
        apiKey:             data.FCM_CLIENT_API_KEY            ?? '',
        authDomain:         data.FCM_CLIENT_AUTH_DOMAIN        ?? '',
        projectId:          data.FCM_CLIENT_PROJECT_ID         ?? '',
        messagingSenderId:  data.FCM_CLIENT_MESSAGING_SENDER_ID ?? '',
        appId:              data.FCM_CLIENT_APP_ID             ?? '',
        vapidKey:           data.FCM_CLIENT_VAPID_KEY          ?? '',
      }
      if (!config.apiKey || !config.projectId) return null
      _configCache = config
      return config
    } catch {
      return null
    } finally {
      _configFetch = null
    }
  })()

  return _configFetch
}

function getFirebaseApp(config: FirebaseClientConfig) {
  if (getApps().length) return getApp()
  return initializeApp({
    apiKey:            config.apiKey,
    authDomain:        config.authDomain,
    projectId:         config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId:             config.appId,
  })
}

/** Request push permission and return the FCM registration token. Returns null if not supported or Firebase not configured. */
export async function getFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  try {
    const config = await getFirebaseConfig()
    if (!config) return null
    const app = getFirebaseApp(config)
    const messaging = getMessaging(app)
    const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration: sw })
    return token || null
  } catch {
    return null
  }
}

/** Subscribe to foreground messages. Must be called after getFcmToken() has resolved (Firebase must be initialised first). */
export function onForegroundMessage(handler: (payload: MessagePayload) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  try {
    if (!getApps().length) return () => undefined
    const messaging = getMessaging(getApp())
    return onMessage(messaging, handler)
  } catch {
    return () => undefined
  }
}

