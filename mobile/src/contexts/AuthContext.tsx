// ─── Auth Context ───────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, getSession, saveAuth, clearAuth, isAuthenticated } from '../lib/auth'
import { api } from '../lib/api'

interface LoginResult {
  pendingVerification?: boolean
  expiredVerification?: boolean
  email?: string
}

interface AuthContextValue {
  session: Session | null
  isLoading: boolean
  isLoggedIn: boolean
  login: (email: string, password: string) => Promise<LoginResult | void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  markOnboardingComplete: () => Promise<void>
  setSessionDirectly: (session: Session) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  isLoggedIn: false,
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
  markOnboardingComplete: async () => {},
  setSessionDirectly: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const stored = await getSession()
      if (stored) {
        setSession(stored)
      }
    } catch {
      // corrupt session
      await clearAuth()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult | void> => {
    const data = await api<{
      access_token?: string
      user?: { id: string; email: string; name: string; role: string; scope: string; tenant_id: string }
      onboarding_completed?: boolean
      pending_verification?: boolean
      expired_verification?: boolean
      email?: string
    }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    // Handle pending/expired verification responses
    if (data.pending_verification) {
      return { pendingVerification: true, email: data.email || email }
    }
    if (data.expired_verification) {
      return { expiredVerification: true, email: data.email || email }
    }

    if (!data.access_token || !data.user) {
      throw new Error('Invalid login response')
    }

    // Fetch tenant context to get tenant name/status
    let tenant: { id: string; name: string; status: string } | undefined
    try {
      const ctx = await api<{
        tenant: { id: string; name: string; status: string }
      }>('/tenant/context', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      tenant = ctx.tenant
    } catch {
      // Tenant context optional — use fallback
      tenant = { id: data.user.tenant_id, name: '', status: 'ACTIVE' }
    }

    const newSession: Session = {
      accessToken: data.access_token!,
      user: data.user!,
      tenant,
      onboardingCompleted: data.onboarding_completed ?? false,
    }

    await saveAuth(newSession)
    setSession(newSession)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore — clearing anyway
    }
    await clearAuth()
    setSession(null)
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const me = await api<{
        id: string; email: string; name: string; role: string; scope: string; tenant_id: string
      }>('/api/auth/me')

      let tenant = session?.tenant
      try {
        const ctx = await api<{ tenant: { id: string; name: string; status: string } }>('/tenant/context')
        tenant = ctx.tenant
      } catch {
        // keep existing tenant info
      }

      if (session) {
        const updated = { ...session, user: me, tenant }
        await saveAuth(updated)
        setSession(updated)
      }
    } catch (err: any) {
      // Only clear the session if the token is explicitly invalid (401).
      // Network errors, 500s, etc. must NOT log the user out.
      if (err?.status === 401) {
        await clearAuth()
        setSession(null)
      }
    }
  }, [session])

  const markOnboardingComplete = useCallback(async () => {
    if (session) {
      const updated = { ...session, onboardingCompleted: true }
      await saveAuth(updated)
      setSession(updated)
    }
  }, [session])

  const setSessionDirectly = useCallback(async (newSession: Session) => {
    await saveAuth(newSession)
    setSession(newSession)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isLoggedIn: !!session,
        login,
        logout,
        refreshSession,
        markOnboardingComplete,
        setSessionDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
