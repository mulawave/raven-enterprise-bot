'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { API_BASE_URL } from '@/lib/constants'

type Status = 'verifying' | 'success' | 'failed' | 'error'

function SubscriptionPaymentCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  const [newPlanTier, setNewPlanTier] = useState<string | null>(null)

  useEffect(() => {
    const reference = searchParams.get('reference') ?? searchParams.get('trxref')

    if (!reference) {
      setStatus('error')
      setMessage('No payment reference found. Please contact support.')
      return
    }

    const session = getSession()
    if (!session?.accessToken) {
      router.replace('/login')
      return
    }

    fetch(`${API_BASE_URL}/api/subscription/payment/verify?reference=${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.message ?? `Error ${res.status}`)
        return data
      })
      .then((data: { success: boolean; status?: string; isUpgrade?: boolean; newPlanTier?: string }) => {
        if (data.success) {
          setStatus('success')
          if (data.newPlanTier) setNewPlanTier(data.newPlanTier)
          setTimeout(() => router.replace('/subscription'), 2500)
        } else {
          setStatus('failed')
          setMessage(`Payment status: ${data.status ?? 'not completed'}. Please try again.`)
        }
      })
      .catch(err => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Verification failed. Please try again.')
      })
  }, [searchParams, router])

  const planLabel = newPlanTier
    ? newPlanTier.charAt(0).toUpperCase() + newPlanTier.slice(1)
    : null

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 p-4">
      <div className="pointer-events-none fixed top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-600 opacity-8 blur-3xl" />
      <div className="pointer-events-none fixed bottom-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-teal-500 opacity-8 blur-3xl" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-20 blur-lg" />
        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-2xl">

          <div className="mb-6">
            <span className="text-2xl font-bold text-emerald-400">Raven Business Automator</span>
            <span className="text-slate-400 ml-2 text-sm">Plan Upgrade</span>
          </div>

          {status === 'verifying' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                <svg className="h-10 w-10 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Confirming payment…</h1>
              <p className="text-sm text-slate-400">Verifying your transaction with Paystack. Please wait.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Plan upgraded! 🎉</h1>
              {planLabel ? (
                <p className="text-sm text-slate-300 mb-1">You are now on the <span className="font-semibold text-emerald-400">{planLabel}</span> plan.</p>
              ) : (
                <p className="text-sm text-slate-300 mb-1">Your plan has been upgraded successfully.</p>
              )}
              <p className="text-xs text-slate-500 mt-2">Returning to your subscription page…</p>
            </>
          )}

          {(status === 'failed' || status === 'error') && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40">
                <svg className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Payment not completed</h1>
              {message && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mb-4">{message}</p>
              )}
              <button
                onClick={() => router.replace('/subscription')}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400"
              >
                Back to Subscription →
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

export default function SubscriptionPaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <svg className="h-10 w-10 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    }>
      <SubscriptionPaymentCallbackContent />
    </Suspense>
  )
}
