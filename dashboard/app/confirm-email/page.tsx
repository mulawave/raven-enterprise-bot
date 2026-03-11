'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setSession } from '@/lib/auth'
import { API_BASE_URL } from '@/lib/constants'

type Status = 'verifying' | 'success' | 'error'

interface ConfirmResponse {
  access_token: string
  user: {
    id: string
    email: string
    name?: string | null
    role: string
    tenant_id: string
  }
  onboarding_step: string
}

export default function ConfirmEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No confirmation token found in this link. Please use the link from your email.')
      return
    }

    fetch(`${API_BASE_URL}/api/auth/confirm-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error((data as any).message ?? `Error ${res.status}`)
        }
        return data as ConfirmResponse
      })
      .then(data => {
        setSession({
          accessToken: data.access_token,
          tenantId: data.user.tenant_id,
          role: data.user.role,
          email: data.user.email,
          name: data.user.name ?? null,
        })
        setStatus('success')
        // Small delay so user sees the success state before redirect
        setTimeout(() => router.replace('/onboarding'), 1200)
      })
      .catch(err => {
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'Verification failed')
      })
  }, [token, router])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 p-4">
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-600 opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-teal-500 opacity-15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-40 blur-xl" />
        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-2xl">

          {status === 'verifying' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                <svg className="h-10 w-10 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Confirming your email…</h1>
              <p className="text-sm text-slate-400">Just a moment while we activate your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-3xl">
                ✅
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Email confirmed!</h1>
              <p className="text-sm text-slate-400">Redirecting you to complete your setup…</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 border border-red-500/30 text-3xl">
                ⚠️
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Link invalid or expired</h1>
              <p className="text-sm text-red-400 mb-6">{errorMsg}</p>
              <a
                href="/register"
                className="inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400"
              >
                Register again
              </a>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
