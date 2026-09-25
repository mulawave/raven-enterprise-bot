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

// ── Plan color schemes by sort order (0-indexed) ───────────────────────────
const PLAN_COLORS = [
  { selectedBorder: 'border-emerald-400', selectedBg: 'bg-emerald-500/20', selectedRing: 'ring-emerald-400', checkColor: 'bg-emerald-400 text-gray-900', highlight: false },
  { selectedBorder: 'border-sky-400',     selectedBg: 'bg-sky-500/20',     selectedRing: 'ring-sky-400',     checkColor: 'bg-sky-400 text-gray-900',     highlight: true  },
  { selectedBorder: 'border-violet-400',  selectedBg: 'bg-violet-500/20',  selectedRing: 'ring-violet-400',  checkColor: 'bg-violet-400 text-gray-900',  highlight: false },
]

interface ApiPlan {
  tier: string
  name: string
  description: string | null
  price_formatted: string
  conversations_limit: number
  features: string[]
}

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
  const [selectedPlan, setSelectedPlan] = useState<string>('starter')
  const [apiPlans, setApiPlans] = useState<ApiPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [recaptchaKey, setRecaptchaKey] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config/public`)
      .then(r => r.json())
      .then((d: Record<string, string | null>) => { if (d.RECAPTCHA_SITE_KEY) setRecaptchaKey(d.RECAPTCHA_SITE_KEY) })
      .catch(() => { /* captcha stays disabled */ })
  }, [])

  // Load plans from API on mount
  useEffect(() => {
    setPlansLoading(true)
    setPlansError(false)
    fetch(`${API_BASE_URL}/api/plans/public`)
      .then(r => r.json())
      .then((d: { plans?: ApiPlan[] }) => {
        const plans = d.plans ?? []
        setApiPlans(plans)
        if (plans.length > 0) setSelectedPlan(plans[0].tier)
      })
      .catch(() => setPlansError(true))
      .finally(() => setPlansLoading(false))
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
    termsAccepted &&
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

      {/* Background glow orbs — subtle */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-600 opacity-5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-teal-500 opacity-5 blur-3xl" />

      <div className="relative z-10 w-full max-w-3xl">
        {/* Glow border */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-10 blur-md" />

        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8 shadow-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <span className="text-2xl font-bold text-emerald-400">Raven Business Automator</span>
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
            <form onSubmit={handleNextStep} className="space-y-4">

              {/* Page title */}
              <div>
                <h1 className="text-lg font-semibold text-white">Create your account</h1>
                <p className="text-xs text-slate-400 mt-0.5">Get your AI business assistant up and running in minutes.</p>
              </div>

              <hr className="border-white/10" />

              {/* ── Row 1: Name+Email | Password ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Left column: Name & Email */}
                <div className="relative rounded-xl border border-white/10 p-3 pt-6 space-y-3">
                  <span className="absolute -top-2.5 left-3 bg-gray-900 px-2 text-xs font-semibold text-emerald-400 tracking-wide">Name &amp; Email</span>

                  {/* Full name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">Full name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-slate-800/80 px-3 py-2.5 text-base md:text-sm text-white placeholder-slate-500 focus:border-emerald-500/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="Jane Adeyemi"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">Email address <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={e => handleEmailChange(e.target.value)}
                        onBlur={e => checkEmailAvailability(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2.5 pr-9 text-base md:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 bg-slate-800/80 transition-colors ${
                          emailStatus === 'invalid' || emailStatus === 'taken' || emailStatus === 'pending'
                            ? 'border-red-500/70 focus:border-red-500/70 focus:ring-red-500/40'
                            : emailStatus === 'available'
                            ? 'border-emerald-400/70 focus:border-emerald-400/70 focus:ring-emerald-400/40'
                            : 'border-white/20 focus:border-emerald-500/70 focus:ring-emerald-500/40'
                        }`}
                        placeholder="jane@mybusiness.ng"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailStatus === 'checking' && (
                          <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                        {emailStatus === 'available' && (
                          <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {(emailStatus === 'taken' || emailStatus === 'pending' || emailStatus === 'invalid') && (
                          <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </div>
                    {emailStatus === 'available' && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Email available
                      </p>
                    )}
                    {(emailStatus === 'taken' || emailStatus === 'pending' || emailStatus === 'invalid') && emailMessage && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-red-400">
                        <svg className="mt-0.5 h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>
                          {emailMessage}
                          {emailStatus === 'taken' && (
                            <> &nbsp;<a href="/login" className="font-semibold underline decoration-dotted hover:text-red-300">Sign in?</a></>
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right column: Account Password */}
                <div className="relative rounded-xl border border-white/10 p-3 pt-6 space-y-3">
                  <span className="absolute -top-2.5 left-3 bg-gray-900 px-2 text-xs font-semibold text-emerald-400 tracking-wide">Account Password</span>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setPwTouched(true) }}
                        className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-base md:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 bg-slate-800/80 transition-colors ${
                          pwTouched && !allCriteriaMet
                            ? 'border-orange-500/50 focus:border-orange-500/50 focus:ring-orange-500/30'
                            : pwTouched && allCriteriaMet
                            ? 'border-emerald-400/70 focus:border-emerald-400/70 focus:ring-emerald-400/40'
                            : 'border-white/20 focus:border-emerald-500/70 focus:ring-emerald-500/40'
                        }`}
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Strength + criteria — single compact row */}
                    {pwTouched && (
                      <div className="mt-1.5 space-y-1">
                        {/* Strength bar + label inline */}
                        {password && strength && (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-1 gap-0.5">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-slate-700'}`} />
                              ))}
                            </div>
                            <span className={`text-xs font-medium shrink-0 ${strength.score >= 4 ? 'text-emerald-400' : strength.score === 3 ? 'text-yellow-400' : 'text-orange-400'}`}>
                              {strength.label}
                            </span>
                          </div>
                        )}
                        {/* Criteria pills — hidden once all met */}
                        {!allCriteriaMet && (
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {criteria.map(c => (
                              <span key={c.label} className={`inline-flex items-center gap-1 text-xs transition-colors ${c.met ? 'text-emerald-400' : 'text-slate-500'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${c.met ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                {c.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-200 mb-1">Confirm password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
                        className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-base md:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 bg-slate-800/80 transition-colors ${
                          confirmTouched && confirmPassword
                            ? passwordsMatch
                              ? 'border-emerald-400/70 focus:border-emerald-400/70 focus:ring-emerald-400/40'
                              : 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/40'
                            : 'border-white/20 focus:border-emerald-500/70 focus:ring-emerald-500/40'
                        }`}
                        placeholder="Repeat your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {confirmTouched && confirmPassword && (
                      <p className={`mt-1 flex items-center gap-1 text-xs ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                        {passwordsMatch ? (
                          <>
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Passwords match
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Passwords do not match
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Full-width: Terms & GDPR spanning 2 columns ── */}
              <div className="relative rounded-xl border border-white/10 p-3 pt-6 space-y-2">
                <span className="absolute -top-2.5 left-3 bg-gray-900 px-2 text-xs font-semibold text-emerald-400 tracking-wide">Terms &amp; Consent</span>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={e => setTermsAccepted(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                      termsAccepted
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-500 bg-slate-800 hover:border-slate-400'
                    }`}>
                      {termsAccepted && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm leading-snug text-slate-200">
                    I have read and agree to the{' '}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300" onClick={e => e.stopPropagation()}>
                      Terms of Service
                    </Link>{' '}and{' '}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300" onClick={e => e.stopPropagation()}>
                      Privacy Policy
                    </Link>
                    , and consent to the processing of my personal data and use of cookies.
                  </span>
                </label>

                {/* GDPR block */}
                <div className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 ring-1 ring-white/5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/25">
                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">GDPR Compliant</p>
                      <p className="text-xs text-slate-400">Your data is encrypted, never sold, and processed under GDPR. Withdraw consent anytime from account settings.</p>
                    </div>
                  </div>
                </div>

                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <span className="text-red-400 font-bold">*</span>
                  Required fields must not be left empty
                </p>
              </div>

              {/* ── Row 2: Captcha | Continue button ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Left: Bot Verification */}
                <div className="relative rounded-xl border border-white/10 p-3 pt-6">
                  <span className="absolute -top-2.5 left-3 bg-gray-900 px-2 text-xs font-semibold text-emerald-400 tracking-wide">Bot Verification</span>
                  {recaptchaKey ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <ReCAPTCHA
                        ref={recaptchaRef}
                        sitekey={recaptchaKey}
                        theme="dark"
                        onChange={token => setCaptchaToken(token)}
                        onExpired={() => setCaptchaToken(null)}
                      />
                      {!captchaToken && (
                        <p className="text-xs text-slate-500">Complete the verification to continue</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center min-h-[60px]">
                      <p className="text-xs text-slate-500">No verification required</p>
                    </div>
                  )}
                </div>

                {/* Right: Submit */}
                <div className="relative rounded-xl border border-white/10 p-3 pt-6 flex flex-col justify-center gap-3">
                  <span className="absolute -top-2.5 left-3 bg-gray-900 px-2 text-xs font-semibold text-emerald-400 tracking-wide">Submit</span>

                  {error && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={!canProceed}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 font-semibold text-white transition-all hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-teal-500"
                  >
                    Continue →
                  </button>

                  {!canProceed && (name || email || password) && (
                    <p className="text-center text-xs text-slate-500">Complete all fields above to continue</p>
                  )}
                </div>
              </div>

              {/* ── Nav cards — side by side on sm+ ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-400/30">
                      <svg className="h-4 w-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Have an account?</p>
                      <p className="text-xs text-slate-400">Sign in to your portal</p>
                    </div>
                  </div>
                  <Link
                    href="/login"
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-teal-500/20 px-2.5 py-1.5 text-xs font-semibold text-teal-300 ring-1 ring-teal-400/40 transition-all hover:bg-teal-500/30 hover:text-teal-200"
                  >
                    Login
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <Link
                  href="/"
                  className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-medium text-slate-400 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-700/60 transition-colors group-hover:bg-slate-600/60">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </span>
                  Back to home
                </Link>
              </div>
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
                {plansLoading ? (
                  // Shimmer skeleton — 3 plan card rows
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-full rounded-xl border-2 border-white/10 bg-slate-800/40 p-4 animate-pulse">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 w-24 rounded bg-white/10" />
                        <div className="h-4 w-20 rounded bg-white/10" />
                      </div>
                      <div className="h-3 w-48 rounded bg-white/10 mb-2" />
                      <div className="flex gap-3">
                        <div className="h-3 w-28 rounded bg-white/10" />
                        <div className="h-3 w-20 rounded bg-white/10" />
                      </div>
                    </div>
                  ))
                ) : plansError ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
                    <p className="text-sm text-red-400 mb-2">Failed to load plans</p>
                    <button
                      type="button"
                      onClick={() => {
                        setPlansLoading(true); setPlansError(false)
                        fetch(`${API_BASE_URL}/api/plans/public`)
                          .then(r => r.json())
                          .then((d: { plans?: ApiPlan[] }) => { const p = d.plans ?? []; setApiPlans(p); if (p.length > 0) setSelectedPlan(p[0].tier) })
                          .catch(() => setPlansError(true))
                          .finally(() => setPlansLoading(false))
                      }}
                      className="text-sm text-red-300 underline hover:text-red-200"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  apiPlans.map((plan, idx) => {
                    const colors = PLAN_COLORS[idx] ?? PLAN_COLORS[0]
                    const isSelected = selectedPlan === plan.tier
                    return (
                      <button
                        key={plan.tier}
                        type="button"
                        onClick={() => setSelectedPlan(plan.tier)}
                        className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150 ${
                          isSelected
                            ? `${colors.selectedBorder} ${colors.selectedBg} ring-2 ${colors.selectedRing}`
                            : 'border-white/15 bg-slate-800/40 hover:bg-white/6 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{plan.name}</span>
                            {colors.highlight && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium">Popular</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white">
                              {plan.price_formatted}<span className="text-xs text-slate-400 font-normal">/month</span>
                            </span>
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${
                              isSelected ? `${colors.checkColor} scale-110` : 'border-2 border-slate-600'
                            }`}>
                              {isSelected && (
                                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                        {plan.description && (
                          <p className="text-xs text-slate-300 mb-2">{plan.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {plan.features.map(f => (
                            <span key={f} className={`text-xs ${isSelected ? 'text-white' : 'text-slate-300'}`}>✓ {f}</span>
                          ))}
                        </div>
                      </button>
                    )
                  })
                )}
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
