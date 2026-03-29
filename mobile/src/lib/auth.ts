// ─── Secure Token Storage ───────────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'raven_access_token'
const SESSION_KEY = 'raven_session'

export interface Session {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
    role: string
    scope?: string
    tenant_id?: string
  }
  tenant?: {
    id: string
    name: string
    status: string
  }
  onboardingCompleted: boolean
}

export async function saveAuth(session: Session): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken)
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function getSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(SESSION_KEY)
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken()
  return !!token
}
