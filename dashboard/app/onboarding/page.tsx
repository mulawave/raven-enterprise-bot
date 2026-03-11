'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingStep = 'welcome' | 'profile' | 'whatsapp' | 'done'

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
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        Logo <span className="text-slate-500 text-xs">(optional)</span>
      </label>

      <div
        onClick={() => { if (uploadState !== 'uploading') inputRef.current?.click() }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={zoneClass}
      >
        {/* Image preview */}
        {uploadState === 'done' && value && (
          <img
            src={`${API_BASE_URL}${value}`}
            alt="Logo preview"
            className="mx-auto mb-3 h-16 w-auto max-w-[120px] rounded-lg object-contain"
          />
        )}

        {/* Icon when no preview */}
        {uploadState !== 'done' && (
          <div className="mb-3 text-3xl">
            {uploadState === 'error' ? '⚠️' : uploadState === 'uploading' ? '📤' : '🖼️'}
          </div>
        )}

        {uploadState === 'idle' && (
          <>
            <p className="text-sm font-medium text-slate-300">
              Drag your logo here, or{' '}
              <span className="text-emerald-400 underline underline-offset-2">click to browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG or WEBP · max 5 MB</p>
          </>
        )}

        {uploadState === 'uploading' && (
          <div className="w-full max-w-[220px]">
            <p className="text-sm font-medium text-slate-300 mb-3">Uploading…</p>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{progress}%</p>
          </div>
        )}

        {uploadState === 'done' && (
          <>
            <p className="text-sm font-medium text-emerald-400">✓ Logo uploaded</p>
            <p className="text-xs text-slate-500 mt-1">Click to replace</p>
          </>
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
  const session = typeof window !== 'undefined' ? getSession() : null

  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Redirect to overview if already completed onboarding
  useEffect(() => {
    if (!session) {
      router.replace('/login')
    }
  }, [session, router])

  // ── Save profile (step 2) ────────────────────────────────────────────────

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

    const keys = [
      { key: 'META_APP_SECRET', value: whatsapp.metaAppSecret.trim() },
      { key: 'META_WEBHOOK_VERIFY_TOKEN', value: whatsapp.metaWebhookVerifyToken.trim() },
      { key: 'META_ACCESS_TOKEN', value: whatsapp.metaAccessToken.trim() },
      { key: 'META_PHONE_NUMBER_ID', value: whatsapp.metaPhoneNumberId.trim() },
      ...(whatsapp.openaiApiKey.trim() ? [{ key: 'OPENAI_API_KEY', value: whatsapp.openaiApiKey.trim() }] : []),
    ]

    try {
      // Upsert each key individually using the existing config endpoint
      await Promise.all(
        keys.map(({ key, value }) =>
          api('/api/config/keys', {
            method: 'POST',
            body: JSON.stringify({ key, value }),
          }).catch(() => {
            // Fallback: try the admin config path
            return fetch(`${API_BASE_URL}/admin/config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.accessToken}` },
              body: JSON.stringify({ key, value }),
            })
          }),
        ),
      )

      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API keys.')
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-900 p-4">
      {/* Background */}
      <div className="pointer-events-none fixed top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-600 opacity-10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-teal-500 opacity-10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-2xl py-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-emerald-400">Raven</span>
          <span className="text-slate-400 ml-2 text-sm">Account Setup</span>
        </div>

        <StepBar current={step} />

        {/* ── Step: Welcome ── */}
        {step === 'welcome' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h1 className="text-2xl font-bold text-white mb-3">Welcome to Raven!</h1>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-md mx-auto">
              Your account is active. Let's spend the next 3 minutes setting up your
              WhatsApp AI assistant so customers can start chatting with your business today.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
              {[
                { icon: '🏢', title: 'Business profile', desc: 'Name, logo, branding' },
                { icon: '📱', title: 'WhatsApp & AI', desc: 'Connect your number and AI key' },
                { icon: '🎉', title: 'Go live', desc: 'Start receiving messages' },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="font-medium text-white text-sm">{item.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep('profile')}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400"
            >
              Let's set up your profile →
            </button>
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

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('welcome')} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/10">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60"
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
                  { key: 'metaAppSecret', label: 'App Secret', hint: 'App Settings → Basic', placeholder: 'abc123…' },
                  { key: 'metaWebhookVerifyToken', label: 'Webhook Verify Token', hint: 'Any string you choose — set the same in Meta dashboard', placeholder: 'raven-verify-abc' },
                  { key: 'metaAccessToken', label: 'Access Token (permanent)', hint: 'System User → Generate token', placeholder: 'EAABwz…' },
                  { key: 'metaPhoneNumberId', label: 'Phone Number ID', hint: 'WhatsApp → API Setup', placeholder: '1234567890' },
                ].map(({ key, label, hint, placeholder }) => (
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
                    <p className="text-xs text-slate-500 mt-1">{hint}</p>
                  </div>
                ))}
              </fieldset>

              {/* OpenAI key */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  AI (optional but recommended)
                </legend>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">OpenAI API Key</label>
                  <input
                    type="text"
                    value={whatsapp.openaiApiKey}
                    onChange={e => setWhatsapp({ ...whatsapp, openaiApiKey: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white font-mono text-sm placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none"
                    placeholder="sk-…"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Without this the bot responds with rule-based replies only. You can add it later.
                  </p>
                </div>
              </fieldset>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('profile')} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-slate-300 transition hover:bg-white/10">
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white transition disabled:opacity-60"
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

            <button
              onClick={() => router.replace('/overview')}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-teal-400"
            >
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
