const SESSION_KEY = 'session'
const TENANT_KEY = 'tenant'

export interface DashboardSession {
  tenantId: string
  role: string
}

export function getSession(): DashboardSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as DashboardSession
  } catch {
    return null
  }
}

export function setSession(tenantId: string): void {
  if (typeof window === 'undefined') return
  const session: DashboardSession = { tenantId, role: 'tenant' }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(TENANT_KEY, tenantId)
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TENANT_KEY)
}

export function isAuthenticated(): boolean {
  return !!getSession()
}
