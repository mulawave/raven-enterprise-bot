'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { API_BASE_URL } from '@/lib/constants'

export default function CheckEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? 'your inbox'

  const [isResending, setIsResending] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending || email === 'your inbox') return
    setIsResending(true)
    setResendMsg(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setResendMsg('A new confirmation email has been sent.')
        setCooldown(60)
      } else {
        const data = await res.json().catch(() => ({}))
        setResendMsg(data.message || 'Could not resend. Please try again later.')
      }
    } catch {
      setResendMsg('Could not connect. Please check your connection.')
    } finally {
      setIsResending(false)
    }
  }, [cooldown, isResending, email])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 p-4">
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-600 opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-teal-500 opacity-15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-40 blur-xl" />
        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-3xl">
            ✉️
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            We sent a confirmation link to<br />
            <span className="font-semibold text-emerald-400">{email}</span>
          </p>
          <p className="text-slate-500 text-xs mb-6">
            Click the link in that email to activate your account and begin onboarding.
            The link expires in 24 hours.
          </p>

          {/* Resend CTA */}
          <div className="mb-6">
            {resendMsg && (
              <p className="mb-3 text-xs text-emerald-400">{resendMsg}</p>
            )}
            <button
              onClick={handleResend}
              disabled={isResending || cooldown > 0 || email === 'your inbox'}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/30 transition-all hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  Sending…
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend confirmation email
                </>
              )}
            </button>
          </div>

          <p className="text-slate-500 text-xs">
            Wrong email?{' '}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Start over
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
