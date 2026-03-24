'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setSession } from '@/lib/auth'
import { API_BASE_URL } from '@/lib/constants'

interface TenantLoginResponse {
  access_token: string
  onboarding_completed?: boolean
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
        onboardingCompleted: data.onboarding_completed ?? false,
      })
      if (!data.onboarding_completed) {
        router.replace('/onboarding')
      } else {
        router.replace('/overview')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the API')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 p-4">
      {/* Background glow orbs — subtle */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-600 opacity-5 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-teal-500 opacity-5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/2 h-64 w-64 rounded-full bg-cyan-600 opacity-[0.03] blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Glow border */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-10 blur-md" />

        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-2xl">
          {/* Logo */}
          <div className="mb-10 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Raven Business Automator (RBA)</h1>
            <p className="mt-1 text-sm font-medium text-teal-300">Tenant Portal</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 backdrop-blur-sm">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Tenant Access</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-3 block text-sm font-bold text-slate-100">
                Work Email
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full rounded-xl border border-white/20 bg-slate-800/80 py-4 pl-12 pr-4 text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-3 block text-sm font-bold text-slate-100">
                Password
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full rounded-xl border border-white/20 bg-slate-800/80 py-4 pl-12 pr-4 text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Legal notice */}
            <div className="rounded-xl border border-white/10 bg-slate-800/60 px-4 py-3">
              <p className="text-xs leading-relaxed text-slate-300">
                By signing in, you acknowledge that you have read and agree to our{' '}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
                  Terms of Service
                </Link>{' '}and{' '}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
                  Privacy Policy
                </Link>
                , and consent to the use of cookies as described therein.
              </p>
            </div>

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

        {/* Navigation links */}
        <div className="mt-5 space-y-3">
          {/* No account CTA */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
                <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white">New to Raven Business Automator?</p>
                <p className="text-xs text-slate-400">Sign up and launch your AI bot in minutes</p>
              </div>
            </div>
            <Link
              href="/register"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40 transition-all hover:bg-emerald-500/30 hover:text-emerald-200"
            >
              Start here
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Back to home */}
          <Link
            href="/"
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-slate-400 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-700/60 transition-colors group-hover:bg-slate-600/60">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </span>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
