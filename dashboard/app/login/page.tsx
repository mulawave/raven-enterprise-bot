'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setSession } from '@/lib/auth'
import { API_BASE_URL } from '@/lib/constants'

interface TenantLoginResponse {
  access_token: string
  user: {
    id: string
    email: string
    name?: string | null
    role: string
    tenant_id: string
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      })

      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Invalid tenant credentials.' : `API error (${res.status})`)
      }

      const data = await res.json() as TenantLoginResponse

      setSession({
        accessToken: data.access_token,
        tenantId: data.user.tenant_id,
        role: data.user.role,
        email: data.user.email,
        name: data.user.name ?? null,
      })
      router.replace('/overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the API')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 p-4">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-600 opacity-20 blur-3xl" />
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-teal-500 opacity-20 blur-3xl"
        style={{ animationDelay: '2s' }}
      />
      <div className="pointer-events-none absolute bottom-1/4 left-1/2 h-64 w-64 rounded-full bg-cyan-600 opacity-10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Glow border */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-50 blur-xl" />

        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-2xl">
          {/* Logo */}
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-2xl shadow-emerald-500/50">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white">Raven Dashboard</h1>
            <p className="mt-2 text-lg font-medium text-teal-300">Tenant Portal</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 backdrop-blur-sm">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Tenant Access</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-3 block text-sm font-bold text-white">
                Work Email
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5 text-teal-300 transition-colors group-focus-within:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0l-3-3m3 3l-3 3M4 6h16M4 18h16" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={isLoading}
                  required
                  className="w-full rounded-xl border-2 border-white/30 bg-white/10 py-4 pl-12 pr-4 text-white placeholder-teal-300/60 backdrop-blur-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-3 block text-sm font-bold text-white">
                Password
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5 text-teal-300 transition-colors group-focus-within:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2h-1V9a5 5 0 00-10 0v2H6a2 2 0 00-2 2v6a2 2 0 002 2zm3-10V9a3 3 0 016 0v2H9z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  required
                  className="w-full rounded-xl border-2 border-white/30 bg-white/10 py-4 pl-12 pr-4 text-white placeholder-teal-300/60 backdrop-blur-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
