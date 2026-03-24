'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'raven_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage not available (SSR guard)
    }
  }, [])

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch {}
    setVisible(false)
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, 'declined') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">We use cookies &amp; similar technologies</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Raven Business Automator uses essential cookies to keep you signed in and improve your experience. We also collect
              analytics data to understand how the platform is used. By clicking <strong className="text-slate-300">Accept</strong>,
              you consent to our use of cookies as described in our{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
              >
                Privacy Policy
              </Link>
              . You can withdraw consent at any time by clearing your browser cookies.
            </p>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
                Terms of Service
              </Link>
              <span>·</span>
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={decline}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
