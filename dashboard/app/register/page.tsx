'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { API_BASE_URL } from '@/lib/constants'

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '₦49,000',
    period: '/month',
    description: 'Perfect for small businesses getting started with AI.',
    features: ['500 conversations/month', 'WhatsApp bot', 'Menu & ordering', 'Basic analytics'],
    accent: 'border-emerald-500/40',
    badge: 'bg-emerald-500/15 text-emerald-300',
  },
  {
    id: 'growth' as const,
    name: 'Growth',
    price: '₦199,000',
    period: '/month',
    description: 'For growing businesses with higher volume.',
    features: ['2,500 conversations/month', 'Multi-branch support', 'Broadcast messaging', 'Advanced analytics'],
    accent: 'border-sky-500/40',
    badge: 'bg-sky-500/15 text-sky-300',
    highlight: true,
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '₦799,000',
    period: '/month',
    description: 'Unlimited scale with full white-labelling.',
    features: ['Unlimited conversations', 'White-label branding', 'Priority support', 'Custom integrations'],
    accent: 'border-violet-500/40',
    badge: 'bg-violet-500/15 text-violet-300',
  },
]

type PlanTier = 'starter' | 'growth' | 'enterprise'
type Step = 'account' | 'plan'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')

  // Account fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('starter')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validateAccount() {
    if (!name.trim()) return 'Please enter your name'
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password !== confirmPassword) return 'Passwords do not match'
    return null
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    const err = validateAccount()
    if (err) { setError(err); return }
    setError(null)
    setStep('plan')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, planTier: selectedPlan }),
      })

      const data = await res.json() as { message?: string; error?: string; message_text?: string }

      if (!res.ok) {
        throw new Error(
          (data as any).message ?? (data as any).error ?? `Error ${res.status}`,
        )
      }

      router.replace('/register/check-email?email=' + encodeURIComponent(email.trim().toLowerCase()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 p-4">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-600 opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-teal-500 opacity-15 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Glow border */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-40 blur-xl" />

        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-2xl font-bold text-emerald-400">Raven</span>
              <span className="text-sm text-slate-400 ml-2">Enterprise Bot</span>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${step === 'account' ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
              <div className={`h-0.5 w-6 ${step === 'plan' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <div className={`h-2 w-2 rounded-full ${step === 'plan' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </div>
          </div>

          {/* --- Step 1: Account details --- */}
          {step === 'account' && (
            <form onSubmit={handleNextStep} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold text-white">Create your account</h1>
                <p className="text-sm text-slate-400 mt-1">Get your AI business assistant up and running in minutes.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="Jane Adeyemi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="jane@mybusiness.ng"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="Repeat password"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400"
              >
                Continue →
              </button>

              <p className="text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-400 hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {/* --- Step 2: Plan selection --- */}
          {step === 'plan' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold text-white">Choose your plan</h1>
                <p className="text-sm text-slate-400 mt-1">You can change or upgrade at any time.</p>
              </div>

              <div className="space-y-3">
                {PLANS.map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      selectedPlan === plan.id
                        ? `${plan.accent} bg-white/8 ring-1 ring-emerald-500/40`
                        : 'border-white/10 bg-white/3 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{plan.name}</span>
                        {plan.highlight && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium">Popular</span>
                        )}
                      </div>
                      <span className="font-bold text-white">
                        {plan.price}<span className="text-xs text-slate-400 font-normal">{plan.period}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{plan.description}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {plan.features.map(f => (
                        <span key={f} className="text-xs text-slate-300">✓ {f}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('account'); setError(null) }}
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Creating account…
                    </span>
                  ) : 'Create account →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
