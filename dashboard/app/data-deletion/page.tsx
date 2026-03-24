'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { API_BASE_URL } from '@/lib/constants'

type Step = 'form' | 'submitted'

function DataDeletionForm() {
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('t') ?? ''

  const [identifierType, setIdentifierType] = useState<'phone' | 'email'>('phone')
  const [identifier, setIdentifier] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<Step>('form')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [statusUrl, setStatusUrl] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) {
      setError('This page is missing a required business identifier. Please use the link provided by the business.')
      return
    }
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE_URL}/api/data-deletion/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, identifier: identifier.trim(), identifierType }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`)
      }

      const data = await res.json() as { confirmationCode: string; statusUrl: string }
      setConfirmationCode(data.confirmationCode)
      setStatusUrl(data.statusUrl)
      setStep('submitted')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <nav className="border-b border-white/5 px-6 h-14 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-indigo-400 font-bold tracking-tight">Raven Business Automator (RBA)</Link>
        <Link href="/privacy" className="text-sm text-slate-400 hover:text-white">Privacy Policy</Link>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Data Deletion Request</h1>
        <p className="text-slate-400 text-sm mb-10">
          You have the right to request deletion of your personal data held by this business.
          Once submitted, your records — including conversations, orders, and bookings — will be permanently erased.
        </p>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                How would you like to identify your account?
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIdentifierType('phone')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    identifierType === 'phone'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-white/10 text-slate-400 hover:border-white/30'
                  }`}
                >
                  Phone number
                </button>
                <button
                  type="button"
                  onClick={() => setIdentifierType('email')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    identifierType === 'email'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-white/10 text-slate-400 hover:border-white/30'
                  }`}
                >
                  Email address
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-slate-300 mb-2">
                {identifierType === 'phone' ? 'Phone number (with country code)' : 'Email address'}
              </label>
              <input
                id="identifier"
                type={identifierType === 'email' ? 'email' : 'tel'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={identifierType === 'phone' ? '+2348012345678' : 'you@example.com'}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !identifier.trim()}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Submitting…
                </span>
              ) : (
                'Submit deletion request'
              )}
            </button>

            <p className="text-xs text-slate-500 text-center">
              By submitting this form you confirm your request for permanent data erasure.
              This action cannot be undone.
            </p>
          </form>
        ) : (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 text-xl mt-0.5">✓</span>
              <div>
                <h2 className="font-semibold text-emerald-300">Request received</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Your data deletion request has been logged. The business will process it and permanently
                  erase your records. You can check the status using your confirmation code below.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Confirmation code</p>
                <p className="font-mono text-sm text-indigo-300 break-all">{confirmationCode}</p>
              </div>
              {statusUrl && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Status URL</p>
                  <a
                    href={statusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 hover:underline break-all"
                  >
                    {statusUrl}
                  </a>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Please save your confirmation code. You may need it to follow up if the deletion is not
              completed within 30 days.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-8 px-6 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-6">
          <Link href="/privacy" className="hover:text-slate-400">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-400">Terms of Use</Link>
        </div>
      </footer>
    </div>
  )
}

export default function DataDeletionPage() {
  return (
    <Suspense>
      <DataDeletionForm />
    </Suspense>
  )
}
