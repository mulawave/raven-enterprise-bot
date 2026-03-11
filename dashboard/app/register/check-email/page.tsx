'use client'

import Link from 'next/link'

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const email = searchParams.email ?? 'your inbox'

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
          <p className="text-slate-500 text-xs mb-8">
            Click the link in that email to activate your account and begin onboarding.
            The link expires in 24 hours.
          </p>
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
