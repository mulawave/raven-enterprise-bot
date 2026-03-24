'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, DashboardSession } from '@/lib/auth'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'
import ReCAPTCHA from 'react-google-recaptcha'

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingStep = 'welcome' | 'payment' | 'profile' | 'whatsapp' | 'done'

interface ProfileForm {
  businessName: string
  logoUrl: string
  primaryColor: string
  whatsappNumber: string
  industry: string
  website: string
}

interface WhatsAppForm {
  metaAppSecret: string
  metaWebhookVerifyToken: string
  metaAccessToken: string
  metaPhoneNumberId: string
  openaiApiKey: string
}

// ─── Logo uploader ─────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

interface LogoUploaderProps {
  value: string
  onChange: (url: string) => void
}

function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadState, setUploadState] = useState<UploadState>(() => value ? 'done' : 'idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // If parent sets a value after mount (e.g. loaded from API), reflect it
  useEffect(() => {
    if (value && uploadState === 'idle') setUploadState('done')
  }, [value, uploadState])

  const upload = useCallback((file: File) => {
    if (!file.type.match(/\/(jpg|jpeg|png|gif|svg\+xml|webp)$/)) {
      setUploadError('Only JPG, PNG, SVG, or WEBP files are allowed.')
      setUploadState('error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File must be under 5 MB.')
      setUploadState('error')
      return
    }

    setUploadError(null)
    setProgress(0)
    setUploadState('uploading')

    // Read token at upload time — always fresh from storage
    const token = (() => { try { return JSON.parse(localStorage.getItem('session') ?? '{}')?.accessToken } catch { return null } })()
    if (!token) {
      setUploadState('error')
      setUploadError('Not authenticated — please refresh the page')
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          if (data.error) {
            setUploadState('error')
            setUploadError(data.error.message ?? 'Upload failed')
          } else {
            setUploadState('done')
            onChange(data.logoUrl)
          }
        } catch {
          setUploadState('error')
          setUploadError('Invalid server response')
        }
      } else {
        setUploadState('error')
        setUploadError(`Upload failed (${xhr.status})`)
      }
    })
    xhr.addEventListener('error', () => {
      setUploadState('error')
      setUploadError('Network error — please try again')
    })

    const form = new FormData()
    form.append('file', file)
    xhr.open('POST', `${API_BASE_URL}/tenant/branding/upload/logo`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(form)
  }, [onChange])

  const handleFile = useCallback((file: File | null | undefined) => {
    if (file) upload(file)
  }, [upload])

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true) }
  function handleDragLeave() { setIsDragging(false) }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const zoneClass = [
    'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all select-none',
    uploadState !== 'uploading' ? 'cursor-pointer' : 'cursor-not-allowed',
    isDragging ? 'border-emerald-400 bg-emerald-500/10' :
    uploadState === 'done' ? 'border-emerald-500/50 bg-emerald-500/5' :
    uploadState === 'error' ? 'border-red-500/50 bg-red-500/5' :
    'border-white/15 bg-white/5 hover:border-white/30',
  ].join(' ')

  const previewSrc = value ? (value.startsWith('http') ? value : `${API_BASE_URL}${value}`) : null

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        Logo <span className="text-slate-500 text-xs">(optional)</span>
      </label>

      {/* ── Preview panel — always visible when a logo URL is set ── */}
      {previewSrc && (
        <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 overflow-hidden">
            <img
              src={previewSrc}
              alt="Logo preview"
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-400">✓ Logo uploaded</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{value}</p>
            <button
              type="button"
              onClick={() => { if (uploadState !== 'uploading') inputRef.current?.click() }}
              className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              Replace logo
            </button>
          </div>
        </div>
      )}

      {/* ── Drop zone ── */}
      <div
        onClick={() => { if (uploadState !== 'uploading') inputRef.current?.click() }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={zoneClass}
      >
        {/* Icon */}
        <div className="mb-3 text-3xl">
          {uploadState === 'error' ? '⚠️' : uploadState === 'uploading' ? '📤' : '🖼️'}
        </div>

        {uploadState === 'idle' && (
          <>
            <p className="text-sm font-medium text-slate-300">
              {previewSrc ? 'Drag a new logo here, or ' : 'Drag your logo here, or '}
              <span className="text-emerald-400 underline underline-offset-2">click to browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG or WEBP · max 5 MB</p>
          </>
        )}

        {uploadState === 'done' && !previewSrc && (
          <>
            <p className="text-sm font-medium text-emerald-400">✓ Logo uploaded</p>
            <p className="text-xs text-slate-500 mt-1">Click to replace</p>
          </>
        )}

        {uploadState === 'done' && previewSrc && (
          <p className="text-xs text-slate-500">Click or drag to replace</p>
        )}

        {uploadState === 'uploading' && (
          <div className="w-full max-w-[240px]">
            <p className="text-sm font-medium text-slate-300 mb-3">Uploading…</p>
            {/* Progress bar */}
            <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-emerald-400 mt-2">{progress}%</p>
          </div>
        )}

        {uploadState === 'error' && (
          <>
            <p className="text-sm font-medium text-red-400">{uploadError}</p>
            <p className="text-xs text-slate-400 mt-1">Click to try again</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}

// ─── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'payment', label: 'Subscription' },
  { id: 'profile', label: 'Business profile' },
  { id: 'whatsapp', label: 'WhatsApp & AI' },
  { id: 'done', label: 'Done' },
] as const

function StepBar({ current }: { current: OnboardingStep }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
            i < idx ? 'bg-emerald-500 text-white'
            : i === idx ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/40'
            : 'bg-white/10 text-slate-500'
          }`}>
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`ml-1.5 text-xs font-medium hidden sm:inline ${i === idx ? 'text-emerald-400' : i < idx ? 'text-slate-300' : 'text-slate-600'}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`mx-3 h-0.5 w-8 sm:w-12 rounded-full transition-all ${i < idx ? 'bg-emerald-500' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  // Stabilise session: getSession() returns JSON.parse() = new object every call.
  // If we read it in the component body, every re-render creates a new reference,
  // which makes the [session, router] useEffect re-fire on every state change.
  const [session] = useState<DashboardSession | null>(() =>
    typeof window !== 'undefined' ? getSession() : null,
  )

  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [isResumingStep, setIsResumingStep] = useState(true) // true while we fetch the user's step from backend
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscription plan info for the payment step
  const [planInfo, setPlanInfo] = useState<{ planName: string; amountKobo: number; planTier: string } | null>(null)
  const [isInitializingPayment, setIsInitializingPayment] = useState(false)

  const [profile, setProfile] = useState<ProfileForm>({
    businessName: session?.name ?? '',
    logoUrl: '',
    primaryColor: '#10b981',
    whatsappNumber: '',
    industry: '',
    website: '',
  })

  const [whatsapp, setWhatsapp] = useState<WhatsAppForm>({
    metaAppSecret: '',
    metaWebhookVerifyToken: 'raven-verify-' + (session?.tenantId?.slice(0, 8) ?? 'token'),
    metaAccessToken: '',
    metaPhoneNumberId: '',
    openaiApiKey: '',
  })

  const [openHelp, setOpenHelp] = useState<Record<string, boolean>>({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [recaptchaKey, setRecaptchaKey] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/config/public`)
      .then(r => r.json())
      .then((d: Record<string, string | null>) => { if (d.RECAPTCHA_SITE_KEY) setRecaptchaKey(d.RECAPTCHA_SITE_KEY) })
      .catch(() => { /* captcha stays disabled */ })
  }, [])

  // Redirect to login if no session; fetch subscription + onboarding state to resume at the correct step
  useEffect(() => {
    if (!session) {
      router.replace('/login')
      return
    }

    fetch(`${API_BASE_URL}/api/subscription/payment/status`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: {
        subscriptionStatus: string
        planName: string
        amountKobo: number
        planTier: string
        onboardingStep: string | null
        onboardingCompleted: boolean
      } | null) => {
        if (data) {
          setPlanInfo({ planName: data.planName, amountKobo: data.amountKobo, planTier: data.planTier })

          if (data.onboardingCompleted || data.onboardingStep === 'done') {
            // Fully completed — go straight to the dashboard
            router.replace('/overview')
            return
          }

          if (data.subscriptionStatus !== 'active') {
            // Payment not done yet — go to welcome (brand new) or payment (returning)
            setStep(data.onboardingStep === 'payment' ? 'payment' : 'welcome')
          } else {
            // Payment done — resume at the saved onboarding step
            const resumeStep = (data.onboardingStep as OnboardingStep | null)
            if (resumeStep === 'whatsapp') setStep('whatsapp')
            else setStep('profile') // handles 'profile', null, or any unknown value
          }
        }
      })
      .catch(() => {
        // Status check failed — fall back to welcome so the user can proceed normally
        setStep('welcome')
      })
      .finally(() => setIsResumingStep(false))
  }, [session, router])

  // ── Initialize subscription payment (step 2) ─────────────────────────────

  async function handlePayNow() {
    setIsInitializingPayment(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscription/payment/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? `Error ${res.status}`)
      if (data.already_paid) {
        setStep('profile')
        return
      }
      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment. Please try again.')
    } finally {
      setIsInitializingPayment(false)
    }
  }

  // ── Save profile (step 3) ────────────────────────────────────────────────

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile.businessName.trim()) { setError('Business name is required'); return }
    if (!profile.whatsappNumber.trim()) { setError('WhatsApp number is required'); return }

    setIsSaving(true)
    setError(null)

    try {
      await api('/tenant/branding', {
        method: 'POST',
        body: JSON.stringify({
          name: profile.businessName.trim(),
          logoUrl: profile.logoUrl.trim() || undefined,
          primaryColor: profile.primaryColor,
          whatsappNumber: profile.whatsappNumber.trim(),
        }),
      })

      // Persist industry/website in theme json via a quick patch
      if (profile.industry || profile.website) {
        await fetch(`${API_BASE_URL}/tenant/branding/extra`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken}` },
          body: JSON.stringify({ industry: profile.industry, website: profile.website }),
        }).catch(() => { /* optional fields — swallow */ })
      }

      setStep('whatsapp')
      // Persist the advance to whatsapp step so reloads resume here
      await fetch(`${API_BASE_URL}/api/onboarding/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken}` },
        body: JSON.stringify({ step: 'whatsapp' }),
      }).catch(() => { /* non-critical */ })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Save API keys (step 3) ────────────────────────────────────────────────

  async function saveApiKeys(e: React.FormEvent) {
    e.preventDefault()

    const required = ['metaAppSecret', 'metaWebhookVerifyToken', 'metaAccessToken', 'metaPhoneNumberId'] as const
    for (const k of required) {
      if (!whatsapp[k].trim()) {
        setError(`${k.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`)
        return
      }
    }

    setIsSaving(true)
    setError(null)

    try {
      const keys = [
        { key: 'META_APP_SECRET', value: whatsapp.metaAppSecret.trim() },
        { key: 'META_WEBHOOK_VERIFY_TOKEN', value: whatsapp.metaWebhookVerifyToken.trim() },
        { key: 'META_ACCESS_TOKEN', value: whatsapp.metaAccessToken.trim() },
        { key: 'META_PHONE_NUMBER_ID', value: whatsapp.metaPhoneNumberId.trim() },
        ...(whatsapp.openaiApiKey.trim() ? [{ key: 'OPENAI_API_KEY', value: whatsapp.openaiApiKey.trim() }] : []),
      ]

      await api('/api/settings/keys', {
        method: 'POST',
        body: JSON.stringify({ keys }),
      })

      setStep('done')
      // Persist — so re-loading shows the done/dashboard state correctly
      await fetch(`${API_BASE_URL}/api/onboarding/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken}` },
        body: JSON.stringify({ step: 'done' }),
      }).catch(() => { /* non-critical */ })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API keys.')
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  // Block all step content while we're determining where the user should resume
  if (isResumingStep) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
        <div className="pointer-events-none fixed top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-600 opacity-10 blur-3xl" />
        <div className="pointer-events-none fixed bottom-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-teal-500 opacity-10 blur-3xl" />
        <div className="relative z-10 text-center">
          <span className="text-2xl font-bold text-emerald-400">Raven Business Automator</span>
          <div className="mt-8 flex justify-center">
            <svg className="h-8 w-8 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="mt-4 text-sm text-slate-400">Loading your setup progress…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900 p-4">
      {/* Background */}
      <div className="pointer-events-none fixed top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-600 opacity-10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-teal-500 opacity-10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-2xl py-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-emerald-400">Raven Business Automator</span>
          <span className="text-slate-400 ml-2 text-sm">Account Setup</span>
        </div>

        <StepBar current={step} />

        {/* ── Step: Welcome ── */}
        {step === 'welcome' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h1 className="text-2xl font-bold text-white mb-3">Welcome to Raven Business Automator!</h1>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-md mx-auto">
              Your account is active. Let's spend the next 3 minutes setting up your
              WhatsApp AI assistant so customers can start chatting with your business today.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
              {[
                { icon: '💳', title: 'Activate subscription', desc: 'Pay securely via card or bank' },
                { icon: '🏢', title: 'Business profile', desc: 'Name, logo, branding' },
                { icon: '📱', title: 'WhatsApp & AI', desc: 'Connect your number and AI key' },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="font-medium text-white text-sm">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setStep('payment')
                // Persist so a reload resumes at payment, not welcome
                fetch(`${API_BASE_URL}/api/onboarding/step`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken}` },
                  body: JSON.stringify({ step: 'payment' }),
                }).catch(() => { /* non-critical */ })
              }}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400"
            >
              Let's get started →
            </button>
          </div>
        )}

        {/* ── Step: Subscription Payment ── */}
        {step === 'payment' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">💳</div>
              <h2 className="text-xl font-bold text-white mb-1">Activate your subscription</h2>
              <p className="text-sm text-slate-400">
                Pay securely with your card or via bank transfer. You will not be charged any recurring fees automatically — renewals require explicit approval.
              </p>
            </div>

            {/* Plan summary card */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">Your plan</p>
                  <p className="text-xl font-bold text-white capitalize">
                    {planInfo?.planName ?? (planInfo?.planTier ? planInfo.planTier.charAt(0).toUpperCase() + planInfo.planTier.slice(1) + ' Plan' : 'Loading…')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-0.5">Amount due</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {planInfo ? `₦${(planInfo.amountKobo / 100).toLocaleString()}` : '…'}
                  </p>
                </div>
              </div>
              <div className="h-px bg-white/10 mb-4" />
              <ul className="space-y-1.5 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Billed as a one-time activation for your first month</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Payment processed securely by Paystack</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Card, bank transfer, or USSD accepted</li>
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300 mb-6 leading-relaxed">
              You will be redirected to Paystack's secure checkout page. After completing payment you will be automatically returned here to finish setup.
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mb-4">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('welcome')}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/10"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handlePayNow}
                disabled={isInitializingPayment || !planInfo}
                className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isInitializingPayment ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Redirecting to Paystack…
                  </>
                ) : (
                  <>Pay ₦{planInfo ? (planInfo.amountKobo / 100).toLocaleString() : '…'} →</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Profile (3-field groups) ── */}
        {step === 'profile' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-1">Business profile</h2>
            <p className="text-sm text-slate-400 mb-6">How your customers and the AI assistant will know you.</p>

            <form onSubmit={saveProfile} className="space-y-5">
              {/* Group 1 — Identity */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Identity</legend>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Business name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={profile.businessName}
                      onChange={e => setProfile({ ...profile, businessName: e.target.value })}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      placeholder="Mama Cass Kitchen"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Industry</label>
                    <select
                      value={profile.industry}
                      onChange={e => setProfile({ ...profile, industry: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-gray-800 px-4 py-2.5 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    >
                      <option value="">Select industry</option>
                      {['Restaurant / Food', 'Hotel / Hospitality', 'Retail', 'Healthcare', 'E-commerce', 'Professional Services', 'Other'].map(i => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                    <LogoUploader
                      value={profile.logoUrl}
                      onChange={url => setProfile({ ...profile, logoUrl: url })}
                    />
                  </div>
              </fieldset>

              {/* Group 2 — Contact */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Contact</legend>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      WhatsApp number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={profile.whatsappNumber}
                      onChange={e => setProfile({ ...profile, whatsappNumber: e.target.value })}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                      placeholder="+2348012345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Website <span className="text-slate-500 text-xs">(optional)</span></label>
                    <input
                      type="url"
                      value={profile.website}
                      onChange={e => setProfile({ ...profile, website: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
                      placeholder="https://mybusiness.ng"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Group 3 — Branding */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Brand colour</legend>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={profile.primaryColor}
                    onChange={e => setProfile({ ...profile, primaryColor: e.target.value })}
                    className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                    title="Pick brand color"
                  />
                  <input
                    type="text"
                    value={profile.primaryColor}
                    onChange={e => setProfile({ ...profile, primaryColor: e.target.value })}
                    className="w-32 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white font-mono text-sm focus:border-emerald-500/50 focus:outline-none"
                    placeholder="#10b981"
                  />
                  <span className="text-xs text-slate-400">Used in your dashboard and bot messages</span>
                </div>
              </fieldset>

              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-red-400 font-bold">*</span>
                Required fields must not be left empty
              </p>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('payment')} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/10">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !profile.businessName.trim() || !profile.whatsappNumber.trim()}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving…' : 'Save & continue →'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step: WhatsApp & AI keys ── */}
        {step === 'whatsapp' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-1">WhatsApp & AI setup</h2>
            <p className="text-sm text-slate-400 mb-6">
              Enter your Meta credentials to receive WhatsApp messages.{' '}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Open Meta Developer Portal ↗
              </a>
            </p>

            <form onSubmit={saveApiKeys} className="space-y-5">
              {/* WhatsApp keys */}
              <fieldset className="space-y-4">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  Meta / WhatsApp Business API
                </legend>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300 leading-relaxed">
                  App → WhatsApp → Configuration → Webhook URL:
                  <code className="ml-1 font-mono text-white">https://app.raven-ai.online/api/messaging/webhook/whatsapp</code>
                </div>

                {[
                  {
                    key: 'metaAppSecret',
                    label: 'App Secret',
                    placeholder: 'abc123…',
                    helpTitle: 'How to find your App Secret',
                    helpSteps: [
                      'Go to developers.facebook.com and open your app.',
                      'In the left sidebar click App Settings → Basic.',
                      'Click Show next to “App Secret” and copy the value.',
                      'This lets Raven Business Automator (RBA) verify that webhook calls genuinely come from Meta.',
                    ],
                  },
                  {
                    key: 'metaWebhookVerifyToken',
                    label: 'Webhook Verify Token',
                    placeholder: 'raven-verify-abc',
                    helpTitle: 'About the Webhook Verify Token',
                    helpSteps: [
                      "We've pre-filled a unique token for you — you can use it as-is.",
                      'In Meta for Developers go to your app → WhatsApp → Configuration → Webhook.',
                      'In the “Verify token” field enter this exact same value, then click Verify & Save.',
                      'This proves to Meta that you own the server receiving messages.',
                    ],
                  },
                  {
                    key: 'metaAccessToken',
                    label: 'Access Token (permanent)',
                    placeholder: 'EAABwz…',
                    helpTitle: 'How to get a permanent Access Token',
                    helpSteps: [
                      'In Meta for Developers open your app.',
                      'Go to Business Settings → Users → System Users.',
                      'Create or select a System User, then click Generate New Token.',
                      'Select your app and enable whatsapp_business_messaging and whatsapp_business_management permissions.',
                      'Click Generate Token and copy it immediately — it will not be shown again.',
                      'Use a System User token (not a personal token) so it never expires.',
                    ],
                  },
                  {
                    key: 'metaPhoneNumberId',
                    label: 'Phone Number ID',
                    placeholder: '1234567890',
                    helpTitle: 'How to find your Phone Number ID',
                    helpSteps: [
                      'In Meta for Developers go to your app → WhatsApp → API Setup.',
                      'Under the “From” dropdown (Step 1) select your WhatsApp business number.',
                      'The Phone Number ID is the long numeric code shown just below the phone number.',
                      'Copy that numeric code — that is what goes here.',
                    ],
                  },
                ].map(({ key, label, placeholder, helpTitle, helpSteps }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {label} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={whatsapp[key as keyof WhatsAppForm]}
                      onChange={e => setWhatsapp({ ...whatsapp, [key]: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white font-mono text-sm placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
                      placeholder={placeholder}
                    />
                    <button
                      type="button"
                      onClick={() => setOpenHelp(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <svg
                        className={`h-3 w-3 shrink-0 transition-transform duration-200 ${openHelp[key] ? 'rotate-90' : ''}`}
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      How to get this
                    </button>
                    {openHelp[key] && (
                      <div className="mt-2 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-xs">
                        <p className="font-semibold text-slate-100 mb-2">{helpTitle}</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                          {helpSteps.map((s, i) => (
                            <li key={i} className="leading-relaxed">{s}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </fieldset>

              {/* OpenAI key */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  AI (optional but recommended)
                </legend>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    OpenAI API Key <span className="text-slate-500 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={whatsapp.openaiApiKey}
                    onChange={e => setWhatsapp({ ...whatsapp, openaiApiKey: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white font-mono text-sm placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
                    placeholder="sk-…"
                  />
                  <button
                    type="button"
                    onClick={() => setOpenHelp(prev => ({ ...prev, openaiApiKey: !prev['openaiApiKey'] }))}
                    className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <svg
                      className={`h-3 w-3 shrink-0 transition-transform duration-200 ${openHelp['openaiApiKey'] ? 'rotate-90' : ''}`}
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    How to get this
                  </button>
                  {openHelp['openaiApiKey'] && (
                    <div className="mt-2 rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-xs">
                      <p className="font-semibold text-slate-100 mb-2">How to get an OpenAI API key</p>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                        <li className="leading-relaxed">Go to platform.openai.com and sign in (or create a free account).</li>
                        <li className="leading-relaxed">Click your profile icon in the top-right corner, then select API keys.</li>
                        <li className="leading-relaxed">Click Create new secret key, give it a name, and click Create.</li>
                        <li className="leading-relaxed">Copy the key immediately — it starts with sk- and cannot be viewed again after closing the dialogue.</li>
                        <li className="leading-relaxed">Without this key the bot uses rule-based replies only. You can add or update it later from your dashboard settings.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </fieldset>

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

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('profile')} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/10">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !whatsapp.metaAppSecret.trim() ||
                    !whatsapp.metaWebhookVerifyToken.trim() ||
                    !whatsapp.metaAccessToken.trim() ||
                    !whatsapp.metaPhoneNumberId.trim() ||
                    (!!recaptchaKey && !captchaToken)
                  }
                  className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving…' : 'Finish setup →'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep('done')}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition"
              >
                Skip for now — I'll add these later
              </button>
            </form>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-white mb-3">You're all set!</h1>
            <p className="text-slate-400 mb-8 leading-relaxed max-w-md mx-auto">
              Your AI assistant is ready. Head to your dashboard to explore all the features
              and follow the <strong className="text-white">Beginners Guide</strong> to complete your setup.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-8 text-left">
              {[
                { icon: '📱', text: 'WhatsApp bot is live — test by sending a message to your number' },
                { icon: '🍽️', text: 'Add menu items so customers can order through WhatsApp' },
                { icon: '📣', text: 'Send a broadcast to all your customers at once' },
                { icon: '📊', text: 'Watch real-time analytics as conversations come in' },
              ].map(item => (
                <div key={item.text} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className="text-xs text-slate-300 leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left mb-6">
              <input
                id="terms-accept"
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
              />
              <label htmlFor="terms-accept" className="text-sm text-slate-300 cursor-pointer leading-relaxed">
                I accept the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                  Terms &amp; Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                  Privacy Policy
                </a>
                . I understand that the Raven Business Automator (RBA) AI assistant will process messages sent by my customers.
              </label>
            </div>

            <button
              onClick={async () => {
                if (!termsAccepted) return
                // Mark onboarding complete on backend
                await fetch(`${API_BASE_URL}/api/onboarding/complete`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${session?.accessToken}` },
                }).catch(() => { /* best-effort */ })
                // Update local session so the gate doesn't redirect back
                const raw = localStorage.getItem('session')
                if (raw) {
                  try {
                    const s = JSON.parse(raw)
                    localStorage.setItem('session', JSON.stringify({ ...s, onboardingCompleted: true }))
                  } catch { /* ignore */ }
                }
                router.replace('/overview')
              }}
              disabled={!termsAccepted}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
