'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReCAPTCHA from 'react-google-recaptcha'
import { API_BASE_URL } from '@/lib/constants'

// ── helpers ─────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function getPasswordCriteria(pw: string) {
  return [
    { label: 'At least 8 characters',      met: pw.length >= 8 },
    { label: 'One uppercase letter (A–Z)',   met: /[A-Z]/.test(pw) },
    { label: 'One lowercase letter (a–z)',   met: /[a-z]/.test(pw) },
    { label: 'One number (0–9)',             met: /[0-9]/.test(pw) },
    { label: 'One special character (!@#…)', met: /[^A-Za-z0-9]/.test(pw) },
  ]
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  const met = getPasswordCriteria(pw).filter(c => c.met).length
  if (met <= 1) return { score: 1, label: 'Very weak',  color: 'bg-red-500' }
  if (met === 2) return { score: 2, label: 'Weak',       color: 'bg-orange-400' }
  if (met === 3) return { score: 3, label: 'Fair',       color: 'bg-yellow-400' }
  if (met === 4) return { score: 4, label: 'Strong',     color: 'bg-emerald-400' }
  return            { score: 5, label: 'Very strong',  color: 'bg-emerald-400' }
}

// ── mini toast ───────────────────────────────────────────────────────────────
interface Toast { id: number; type: 'success' | 'error'; message: string }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const show = useCallback((type: Toast['type'], message: string) => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return { toasts, show }
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl border transition-all duration-300 pointer-events-auto ${
            t.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
              : 'bg-red-500/20 border-red-500/40 text-red-200'
          }`}
        >
          {t.type === 'success' ? (
            <svg className="h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}

const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '₦49,000',
    period: '/month',
    description: 'Perfect for small businesses getting started with AI.',
    features: ['500 conversations/month', 'WhatsApp bot', 'Menu & ordering', 'Basic analytics'],
    selectedBorder: 'border-emerald-400',
    selectedBg: 'bg-emerald-500/20',
    selectedRing: 'ring-emerald-400',
    checkColor: 'bg-emerald-400 text-gray-900',
    idleBorder: 'border-white/10',
    idleBg: 'bg-white/3',
  },
  {
    id: 'growth' as const,
    name: 'Growth',
    price: '₦199,000',
    period: '/month',
    description: 'For growing businesses with higher volume.',
    features: ['2,500 conversations/month', 'Multi-branch support', 'Broadcast messaging', 'Advanced analytics'],
    selectedBorder: 'border-sky-400',
    selectedBg: 'bg-sky-500/20',
    selectedRing: 'ring-sky-400',
    checkColor: 'bg-sky-400 text-gray-900',
    idleBorder: 'border-white/10',
    idleBg: 'bg-white/3',
    highlight: true,
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '₦799,000',
    period: '/month',
    description: 'Unlimited scale with full white-labelling.',
    features: ['Unlimited conversations', 'White-label branding', 'Priority support', 'Custom integrations'],
    selectedBorder: 'border-violet-400',
    selectedBg: 'bg-violet-500/20',
    selectedRing: 'ring-violet-400',
    checkColor: 'bg-violet-400 text-gray-900',
    idleBorder: 'border-white/10',
    idleBg: 'bg-white/3',
  },
]

type PlanTier = 'starter' | 'growth' | 'enterprise'
type Step = 'account' | 'plan'

// ── email field status ───────────────────────────────────────────────────────
type EmailStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'pending'

export default function RegisterPage() {
  const router = useRouter()
  const { toasts, show: showToast } = useToast()
  const [step, setStep] = useState<Step>('account')

  // Account fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('starter')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [recaptchaKey, setRecaptchaKey] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config/public`)
      .then(r => r.json())
      .then((d: Record<string, string | null>) => { if (d.RECAPTCHA_SITE_KEY) setRecaptchaKey(d.RECAPTCHA_SITE_KEY) })
      .catch(() => { /* captcha stays disabled */ })
  }, [])

  // Email status
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [emailMessage, setEmailMessage] = useState<string>('')

  // Password touched state (show criteria only once user has started typing)
  const [pwTouched, setPwTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  function handleEmailChange(value: string) {
    setEmail(value)
    if (!value.trim()) { setEmailStatus('idle'); setEmailMessage(''); return }
    if (!EMAIL_RE.test(value.trim())) {
      setEmailStatus('invalid')
      setEmailMessage('Please enter a valid email address')
    } else {
      setEmailStatus('idle')
      setEmailMessage('')
    }
  }

  async function checkEmailAvailability(value: string) {
    const trimmed = value.trim().toLowerCase()
    if (!trimmed || !EMAIL_RE.test(trimmed)) return
    setEmailStatus('checking')
    setEmailMessage('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/check-email?email=${encodeURIComponent(trimmed)}`)
      const data = await res.json() as { available: boolean; reason?: string }
      if (data.available) {
        setEmailStatus('available')
        setEmailMessage('Email is available')
        showToast('success', `✓ ${trimmed} is available`)
      } else if (data.reason === 'pending') {
        setEmailStatus('pending')
        setEmailMessage('A confirmation email was already sent to this address. Check your inbox.')
        showToast('error', 'Confirmation already sent — check your inbox')
      } else {
        setEmailStatus('taken')
        setEmailMessage('An account with this email already exists.')
        showToast('error', 'Email already registered')
      }
    } catch {
      setEmailStatus('idle')
    }
  }

  const criteria = getPasswordCriteria(password)
  const strength = password ? passwordStrength(password) : null
  const allCriteriaMet = criteria.every(c => c.met)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  const canProceed =
    name.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    emailStatus === 'available' &&
    allCriteriaMet &&
    passwordsMatch &&
    (!recaptchaKey || captchaToken !== null)

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault()
    if (!canProceed) return
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
      <ToastContainer toasts={toasts} />

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

          {/* ── Step 1: Account details ── */}
          {step === 'account' && (
            <form onSubmit={handleNextStep} className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold text-white">Create your account</h1>
                <p className="text-sm text-slate-400 mt-1">Get your AI business assistant up and running in minutes.</p>
              </div>

              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  placeholder="Jane Adeyemi"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    onBlur={e => checkEmailAvailability(e.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 bg-white/5 transition-colors ${
                      emailStatus === 'invalid' || emailStatus === 'taken' || emailStatus === 'pending'
                        ? 'border-red-500/70 focus:border-red-500/70 focus:ring-red-500/40'
                        : emailStatus === 'available'
                        ? 'border-emerald-400/70 focus:border-emerald-400/70 focus:ring-emerald-400/40'
                        : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/50'
                    }`}
                    placeholder="jane@mybusiness.ng"
                  />
                  {/* Status icon inside input */}
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailStatus === 'checking' && (
                      <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    {emailStatus === 'available' && (
                      <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {(emailStatus === 'taken' || emailStatus === 'pending' || emailStatus === 'invalid') && (
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                </div>
                {/* Below-field feedback */}
                {emailStatus === 'available' && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Great — this email is available
                  </p>
                )}
                {(emailStatus === 'taken' || emailStatus === 'pending' || emailStatus === 'invalid') && emailMessage && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-400">
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                      {emailMessage}
                      {emailStatus === 'taken' && (
                        <> &nbsp;<a href="/login" className="font-semibold underline decoration-dotted hover:text-red-300">Sign in instead?</a></>
                      )}
                    </span>
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPwTouched(true) }}
                    className={`w-full rounded-xl border px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-1 bg-white/5 transition-colors ${
                      pwTouched && !allCriteriaMet
                        ? 'border-orange-500/50 focus:border-orange-500/50 focus:ring-orange-500/30'
                        : pwTouched && allCriteriaMet
                        ? 'border-emerald-400/70 focus:border-emerald-400/70 focus:ring-emerald-400/40'
                        : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/50'
                    }`}
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Strength bar */}
                {pwTouched && password && strength && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-slate-700'}`} />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${strength.score >= 4 ? 'text-emerald-400' : strength.score === 3 ? 'text-yellow-400' : 'text-orange-400'}`}>
                      {strength.label}
                    </span>
                  </div>
                )}

                {/* Criteria checklist */}
                {pwTouched && (
                  <ul className="mt-2.5 grid grid-cols-1 gap-1">
                    {criteria.map(c => (
                      <li key={c.label} className={`flex items-center gap-2 text-xs transition-colors ${c.met ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all ${c.met ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
                          {c.met ? (
                            <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                          )}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
                    className={`w-full rounded-xl border px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-1 bg-white/5 transition-colors ${
                      confirmTouched && confirmPassword
                        ? passwordsMatch
                          ? 'border-emerald-400/70 focus:border-emerald-400/70 focus:ring-emerald-400/40'
                          : 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/40'
                        : 'border-white/10 focus:border-emerald-500/50 focus:ring-emerald-500/50'
                    }`}
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmTouched && confirmPassword && (
                  <p className={`mt-1.5 flex items-center gap-1.5 text-xs ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                    {passwordsMatch ? (
                      <>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Passwords match
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Passwords do not match
                      </>
                    )}
                  </p>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-red-400 font-bold">*</span>
                Required fields must not be left empty
              </p>

              {recaptchaKey && (
                <div className="flex flex-col items-center gap-2">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={recaptchaKey}
                    theme="dark"
                    onChange={token => setCaptchaToken(token)}
                    onExpired={() => setCaptchaToken(null)}
                  />
                  {!captchaToken && (
                    <p className="text-xs text-slate-500">Please complete the verification above to continue</p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={!canProceed}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition-all hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-teal-500"
              >
                Continue →
              </button>

              {!canProceed && (name || email || password) && (
                <p className="text-center text-xs text-slate-500">
                  Complete all fields above to continue
                </p>
              )}

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
                {PLANS.map(plan => {
                  const isSelected = selectedPlan === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                        isSelected
                          ? `${plan.selectedBorder} ${plan.selectedBg} ring-2 ${plan.selectedRing}`
                          : `${plan.idleBorder} ${plan.idleBg} hover:bg-white/6 hover:border-white/20`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{plan.name}</span>
                          {plan.highlight && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium">Popular</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {plan.price}<span className="text-xs text-slate-400 font-normal">{plan.period}</span>
                          </span>
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${
                            isSelected ? `${plan.checkColor} scale-110` : 'border-2 border-slate-600'
                          }`}>
                            {isSelected && (
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{plan.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {plan.features.map(f => (
                          <span key={f} className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>✓ {f}</span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('account'); setError(null); setCaptchaToken(null); recaptchaRef.current?.reset() }}
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
