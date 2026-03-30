'use client'

import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from '@/lib/constants'

interface ActivationStatus {
  activated: boolean
  status?: string
  license_type?: string
  domain?: string
}

interface ActivationResult {
  status: string
  message?: string
  license_type?: string
  verification_token?: string
}

export default function ActivationOverlay() {
  const [checking, setChecking] = useState(true)
  const [activated, setActivated] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)
  const [licenseKey, setLicenseKey] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [domain, setDomain] = useState('')

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/licensing/status`)
      const data: ActivationStatus = await res.json()
      if (data.activated) {
        setActivated(true)
      } else if (data.status === 'PENDING') {
        setPendingApproval(true)
      }
    } catch {
      // API unreachable — show activation form
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomain(window.location.hostname)
    }
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    if (!pendingApproval) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/licensing/status`)
        const data: ActivationStatus = await res.json()
        if (data.activated) {
          setActivated(true)
          setPendingApproval(false)
          window.location.reload()
        }
      } catch { /* keep polling */ }
    }, 30_000)
    return () => clearInterval(interval)
  }, [pendingApproval])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseKey.trim() || !email.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/licensing/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey.trim(),
          email: email.trim(),
          domain,
        }),
      })

      const data: ActivationResult = await res.json()

      if (data.status === 'active') {
        setActivated(true)
        window.location.reload()
      } else if (data.status === 'pending_approval') {
        setPendingApproval(true)
      } else {
        setError(data.message || 'Activation failed. Please check your license key and try again.')
      }
    } catch {
      setError('Could not connect to the activation server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (activated || checking) {
    if (checking) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-blue-400" />
            <p className="text-sm text-slate-400">Checking license status…</p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[440px] w-[660px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-800/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/20">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Activate Admin Console</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter your Raven Enterprise license key to continue.
          </p>
        </div>

        {pendingApproval ? (
          <div className="rounded-2xl border border-blue-400/20 bg-blue-900/30 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-300 ring-1 ring-blue-400/20">
              <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Awaiting Approval</h3>
            <p className="mt-2 text-sm text-slate-400">
              Your activation request has been submitted. An admin will approve your domain shortly.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              Checking for approval…
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div>
                <label htmlFor="admin-license-key" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  License Key
                </label>
                <input
                  id="admin-license-key"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="RVN-REG-XXXXXXXX-XXXXXXXX-XXXX"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20"
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label htmlFor="admin-activation-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Purchase Email
                </label>
                <input
                  id="admin-activation-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Domain
                </label>
                <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-500">
                  <svg className="mr-2 h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.97.633-3.793 1.708-5.272" />
                  </svg>
                  {domain || 'detecting…'}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !licenseKey.trim() || !email.trim()}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-600/20 px-6 py-4 text-sm font-semibold text-blue-300 transition-all hover:-translate-y-0.5 hover:bg-blue-600/30 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400" />
                  Activating…
                </>
              ) : (
                <>
                  Activate License
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-600">
              Your license key was included in your purchase confirmation email.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
