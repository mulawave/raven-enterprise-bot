'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import { Button } from '@/components/Button'

interface ConfigKey {
  key: string
  value: string
  description: string
  is_secret: boolean
  has_value: boolean
}

interface EmailTemplate {
  key: string
  value: string
  description: string
  updated_at: string
}

const SMTP_KEY_LABELS: Record<string, { label: string; type: string; placeholder: string }> = {
  SMTP_HOST:     { label: 'SMTP Host',     type: 'text',     placeholder: 'smtp.sendgrid.net' },
  SMTP_PORT:     { label: 'Port',          type: 'number',   placeholder: '587' },
  SMTP_USER:     { label: 'Username',      type: 'text',     placeholder: 'apikey' },
  SMTP_PASS:     { label: 'Password',      type: 'password', placeholder: '•••••••••' },
  SMTP_FROM:     { label: 'From Address',  type: 'email',    placeholder: 'no-reply@yourdomain.com' },
  SMTP_SECURE:   { label: 'Use TLS (port 465)', type: 'toggle', placeholder: '' },
}

const PROVIDER_OPTIONS = [
  { value: 'smtp', label: 'SMTP', description: 'Send via any SMTP server (SendGrid, Mailgun, Gmail, etc.)' },
  { value: 'internal', label: 'Internal (Ethereal)', description: 'Use Ethereal test account — emails not delivered, preview only' },
]

const TEMPLATE_LABELS: Record<string, { label: string; color: string; vars: string[] }> = {
  EMAIL_TEMPLATE_WELCOME: {
    label: 'Welcome Email',
    color: 'from-indigo-700 to-indigo-900 border-indigo-500',
    vars: ['APP_NAME', 'USER_NAME', 'DASHBOARD_URL', 'YEAR'],
  },
  EMAIL_TEMPLATE_PASSWORD_RESET: {
    label: 'Password Reset',
    color: 'from-red-700 to-red-900 border-red-500',
    vars: ['APP_NAME', 'USER_NAME', 'RESET_URL', 'YEAR'],
  },
  EMAIL_TEMPLATE_INVOICE: {
    label: 'Invoice',
    color: 'from-emerald-700 to-emerald-900 border-emerald-500',
    vars: ['APP_NAME', 'USER_NAME', 'INVOICE_NUMBER', 'BILLING_PERIOD', 'PLAN_NAME', 'AMOUNT', 'PAYMENT_DATE', 'YEAR'],
  },
  EMAIL_TEMPLATE_SUBSCRIPTION_CONFIRMED: {
    label: 'Subscription Confirmed',
    color: 'from-violet-700 to-violet-900 border-violet-500',
    vars: ['APP_NAME', 'USER_NAME', 'PLAN_NAME', 'CONVERSATIONS_LIMIT', 'RENEWAL_DATE', 'DASHBOARD_URL', 'YEAR'],
  },
}

export default function EmailConfigPage() {
  const [keys, setKeys] = useState<Record<string, ConfigKey>>({})
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({})

  // Test email
  const [testTo, setTestTo] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; preview?: string } | null>(null)

  // Templates
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({})
  const [templateSaving, setTemplateSaving] = useState<Record<string, boolean>>({})
  const [templateSaved, setTemplateSaved] = useState<Record<string, boolean>>({})
  const [openTemplate, setOpenTemplate] = useState<string | null>(null)

  // Active tab
  const [tab, setTab] = useState<'smtp' | 'templates'>('smtp')

  async function fetchAll() {
    setIsLoading(true)
    setFetchError(null)
    try {
      const [keysRes, tmplRes] = await Promise.all([
        api.get<Record<string, ConfigKey[]>>(API_ENDPOINTS.CONFIG_KEYS),
        api.get<EmailTemplate[]>(API_ENDPOINTS.CONFIG_EMAIL_TEMPLATES),
      ])
      const flat: Record<string, ConfigKey> = {}
      Object.values(keysRes).flat().forEach((k) => { flat[k.key] = k })
      setKeys(flat)
      const d: Record<string, string> = {}
      Object.keys(SMTP_KEY_LABELS).forEach((k) => { d[k] = flat[k]?.value ?? '' })
      setDrafts(d)
      setTemplates(tmplRes)
      const td: Record<string, string> = {}
      tmplRes.forEach((t) => { td[t.key] = t.value })
      setTemplateDrafts(td)
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  async function saveKey(key: string, value: string) {
    setSaving((s) => ({ ...s, [key]: true }))
    setSaveErrors((e) => ({ ...e, [key]: '' }))
    setSaveSuccess((s) => ({ ...s, [key]: false }))
    try {
      await api.patch(`${API_ENDPOINTS.CONFIG_KEYS}/${key}`, { value: value || null })
      setSaveSuccess((s) => ({ ...s, [key]: true }))
      setTimeout(() => setSaveSuccess((s) => ({ ...s, [key]: false })), 3000)
    } catch (err: any) {
      setSaveErrors((e) => ({ ...e, [key]: err.message || 'Save failed' }))
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  async function saveAllSmtp() {
    const smtpKeys = Object.keys(SMTP_KEY_LABELS).filter((k) => k !== 'SMTP_SECURE')
    for (const key of smtpKeys) {
      if (drafts[key] !== undefined) await saveKey(key, drafts[key])
    }
    // save SMTP_PROVIDER too
    await saveKey('SMTP_PROVIDER', drafts['SMTP_PROVIDER'] ?? 'smtp')
  }

  async function sendTestEmail() {
    if (!testTo.trim()) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const res = await api.post<{ success: boolean; messageId?: string; preview?: string; error?: string }>(
        API_ENDPOINTS.CONFIG_EMAIL_TEST,
        { to: testTo },
      )
      setTestResult({
        success: res.success,
        message: res.success ? `Sent! Message ID: ${res.messageId}` : res.error,
        preview: res.preview,
      })
    } catch (err: any) {
      setTestResult({ success: false, message: err.message })
    } finally {
      setIsTesting(false)
    }
  }

  async function saveTemplate(key: string) {
    setTemplateSaving((s) => ({ ...s, [key]: true }))
    setTemplateSaved((s) => ({ ...s, [key]: false }))
    try {
      await api.patch(`${API_ENDPOINTS.CONFIG_EMAIL_TEMPLATES}/${key}`, { value: templateDrafts[key] })
      setTemplateSaved((s) => ({ ...s, [key]: true }))
      setTimeout(() => setTemplateSaved((s) => ({ ...s, [key]: false })), 3000)
    } catch {
      // show inline
    } finally {
      setTemplateSaving((s) => ({ ...s, [key]: false }))
    }
  }

  const SHIMMER = 'animate-pulse bg-slate-700 rounded'
  const provider = drafts['SMTP_PROVIDER'] ?? keys['SMTP_PROVIDER']?.value ?? 'smtp'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Email Configuration</h1>
        <p className="text-slate-400 text-sm mt-1">Configure SMTP delivery settings and manage email templates</p>
      </div>

      {fetchError && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-300 text-sm">{fetchError}</span>
          <Button size="sm" variant="secondary" onClick={fetchAll}>Retry</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-lg w-fit border border-slate-700">
        {(['smtp', 'templates'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'smtp' ? 'SMTP & Delivery' : 'Email Templates'}
          </button>
        ))}
      </div>

      {/* ── SMTP TAB ── */}
      {tab === 'smtp' && (
        <div className="space-y-6 max-w-2xl">
          {/* Provider selector */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Delivery Provider</h2>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDrafts((d) => ({ ...d, SMTP_PROVIDER: opt.value })); saveKey('SMTP_PROVIDER', opt.value) }}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    provider === opt.value
                      ? 'border-indigo-500 bg-indigo-900/30'
                      : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full border-2 ${provider === opt.value ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'}`} />
                    <span className="text-white text-sm font-medium">{opt.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* SMTP fields (only when provider = smtp) */}
          {provider === 'smtp' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold">SMTP Settings</h2>

              <div className="grid grid-cols-2 gap-4">
                {/* Host */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-400 mb-1">SMTP Host</label>
                  {isLoading ? <div className={`${SHIMMER} h-9`} /> : (
                    <input
                      type="text"
                      value={drafts['SMTP_HOST'] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, SMTP_HOST: e.target.value }))}
                      className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500"
                      placeholder="smtp.sendgrid.net"
                    />
                  )}
                </div>
                {/* Port */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Port</label>
                  {isLoading ? <div className={`${SHIMMER} h-9`} /> : (
                    <input
                      type="number"
                      value={drafts['SMTP_PORT'] ?? '587'}
                      onChange={(e) => setDrafts((d) => ({ ...d, SMTP_PORT: e.target.value }))}
                      className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none"
                    />
                  )}
                </div>
                {/* User */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username</label>
                  {isLoading ? <div className={`${SHIMMER} h-9`} /> : (
                    <input
                      type="text"
                      value={drafts['SMTP_USER'] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, SMTP_USER: e.target.value }))}
                      className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500"
                      placeholder="apikey"
                    />
                  )}
                </div>
                {/* Password */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 flex items-center justify-between">
                    <span>Password</span>
                    <button onClick={() => setShowPass((s) => !s)} className="text-slate-500 hover:text-white transition-colors text-xs">
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </label>
                  {isLoading ? <div className={`${SHIMMER} h-9`} /> : (
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={drafts['SMTP_PASS'] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, SMTP_PASS: e.target.value }))}
                      className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500"
                      placeholder={keys['SMTP_PASS']?.has_value ? '(keep existing)' : 'Enter password'}
                    />
                  )}
                </div>
                {/* From */}
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">From Address</label>
                  {isLoading ? <div className={`${SHIMMER} h-9`} /> : (
                    <input
                      type="email"
                      value={drafts['SMTP_FROM'] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, SMTP_FROM: e.target.value }))}
                      className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500"
                      placeholder="no-reply@yourdomain.com"
                    />
                  )}
                </div>
                {/* TLS toggle */}
                <div className="col-span-2 flex items-center gap-3">
                  <div
                    onClick={() => {
                      const next = drafts['SMTP_SECURE'] === 'true' ? 'false' : 'true'
                      setDrafts((d) => ({ ...d, SMTP_SECURE: next }))
                    }}
                    className={`relative cursor-pointer inline-flex h-5 w-9 items-center rounded-full transition-colors ${drafts['SMTP_SECURE'] === 'true' ? 'bg-indigo-500' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${drafts['SMTP_SECURE'] === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-slate-300">Use TLS (enable for port 465)</span>
                </div>
              </div>

              <Button
                variant="primary"
                isLoading={Object.values(saving).some(Boolean)}
                loadingText="Saving…"
                onClick={saveAllSmtp}
                className="mt-2"
              >
                Save SMTP Settings
              </Button>
            </div>
          )}

          {/* Test email */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Send Test Email</h2>
            <p className="text-slate-400 text-sm">Verify your delivery configuration by sending a test email.</p>

            <div className="flex gap-3">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500"
              />
              <Button
                variant="primary"
                size="sm"
                isLoading={isTesting}
                loadingText="Sending…"
                onClick={sendTestEmail}
                disabled={!testTo.includes('@')}
              >
                Send Test
              </Button>
            </div>

            {testResult && (
              <div className={`rounded-lg p-4 ${testResult.success ? 'bg-green-900/30 border border-green-700/50' : 'bg-red-900/30 border border-red-700/50'}`}>
                <p className={`text-sm font-medium ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
                  {testResult.success ? '✅ Test email sent successfully' : '❌ Test email failed'}
                </p>
                <p className={`text-xs mt-1 ${testResult.success ? 'text-green-400/80' : 'text-red-400/80'}`}>
                  {testResult.message}
                </p>
                {testResult.preview && (
                  <a href={testResult.preview} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline mt-1 block">
                    Preview email (Ethereal) →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Edit HTML email templates. Use <code className="bg-slate-700 px-1 rounded text-indigo-300">{'{{VARIABLE}}'}</code> placeholders — they are replaced at send time.
          </p>

          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${SHIMMER} h-20 w-full rounded-xl`} />
              ))
            : templates.map((tmpl) => {
                const meta = TEMPLATE_LABELS[tmpl.key]
                if (!meta) return null
                const isOpen = openTemplate === tmpl.key
                const isSaving = templateSaving[tmpl.key]
                const saved = templateSaved[tmpl.key]

                return (
                  <div
                    key={tmpl.key}
                    className={`bg-gradient-to-r ${meta.color} border rounded-xl overflow-hidden`}
                  >
                    <button
                      onClick={() => setOpenTemplate(isOpen ? null : tmpl.key)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <div>
                        <span className="text-white font-semibold">{meta.label}</span>
                        <p className="text-white/60 text-xs mt-0.5">{tmpl.description}</p>
                      </div>
                      <span className="text-white/60 text-lg">{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen && (
                      <div className="bg-slate-900 p-5 space-y-4">
                        {/* Template variables reference */}
                        <div className="flex flex-wrap gap-2">
                          {meta.vars.map((v) => (
                            <span key={v} className="text-xs font-mono bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>

                        {/* HTML editor */}
                        <textarea
                          rows={16}
                          value={templateDrafts[tmpl.key] ?? ''}
                          onChange={(e) => setTemplateDrafts((d) => ({ ...d, [tmpl.key]: e.target.value }))}
                          className="w-full bg-slate-950 text-slate-200 text-xs font-mono rounded-lg px-4 py-3 border border-slate-700 focus:border-indigo-500 outline-none resize-y"
                          spellCheck={false}
                        />

                        <div className="flex items-center gap-4">
                          <Button
                            variant="primary"
                            isLoading={isSaving}
                            loadingText="Saving…"
                            onClick={() => saveTemplate(tmpl.key)}
                          >
                            Save Template
                          </Button>
                          {saved && <span className="text-green-400 text-sm">✓ Saved</span>}

                          <button
                            className="ml-auto text-xs text-slate-400 hover:text-white"
                            onClick={() => {
                              const w = window.open('', '_preview')
                              if (w) { w.document.write(templateDrafts[tmpl.key] ?? ''); w.document.close() }
                            }}
                          >
                            Preview in new tab →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          }

          {!isLoading && templates.length === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <p className="text-slate-400">No templates found. Run the database migration to seed default templates.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
