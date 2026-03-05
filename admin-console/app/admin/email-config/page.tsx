'use client'

import { useEffect, useState, useRef } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import { Button } from '@/components/Button'
import {
  Mail, Server, Eye, EyeOff, CheckCircle2, AlertCircle, Send, RefreshCw,
  ChevronDown, ChevronRight, Code2, Maximize2,
} from 'lucide-react'

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

const SMTP_FIELDS: Array<{ key: string; label: string; type: string; placeholder: string; colSpan?: number }> = [
  { key: 'SMTP_HOST', label: 'SMTP Host', type: 'text', placeholder: 'smtp.sendgrid.net' },
  { key: 'SMTP_PORT', label: 'Port', type: 'number', placeholder: '587' },
  { key: 'SMTP_USER', label: 'Username', type: 'text', placeholder: 'apikey' },
  { key: 'SMTP_PASS', label: 'Password', type: 'password', placeholder: 'Enter SMTP password' },
  { key: 'SMTP_FROM', label: 'From Address', type: 'email', placeholder: 'no-reply@yourdomain.com', colSpan: 2 },
]

const PROVIDER_OPTIONS = [
  { value: 'smtp', label: 'SMTP', desc: 'Any SMTP server (SendGrid, Mailgun, Gmail...)' },
  { value: 'internal', label: 'Ethereal (Test)', desc: 'No delivery — preview only' },
]

const TEMPLATE_META: Record<string, { label: string; color: string; vars: string[] }> = {
  EMAIL_TEMPLATE_WELCOME: { label: 'Welcome Email', color: 'text-indigo-300 border-indigo-500/40', vars: ['APP_NAME','USER_NAME','DASHBOARD_URL','YEAR'] },
  EMAIL_TEMPLATE_PASSWORD_RESET: { label: 'Password Reset', color: 'text-red-300 border-red-500/40', vars: ['APP_NAME','USER_NAME','RESET_URL','YEAR'] },
  EMAIL_TEMPLATE_INVOICE: { label: 'Invoice', color: 'text-emerald-300 border-emerald-500/40', vars: ['APP_NAME','USER_NAME','INVOICE_NUMBER','BILLING_PERIOD','PLAN_NAME','AMOUNT','PAYMENT_DATE','YEAR'] },
  EMAIL_TEMPLATE_SUBSCRIPTION_CONFIRMED: { label: 'Subscription Confirmed', color: 'text-violet-300 border-violet-500/40', vars: ['APP_NAME','USER_NAME','PLAN_NAME','CONVERSATIONS_LIMIT','RENEWAL_DATE','DASHBOARD_URL','YEAR'] },
}

const TEMPLATE_ORDER = ['EMAIL_TEMPLATE_WELCOME','EMAIL_TEMPLATE_PASSWORD_RESET','EMAIL_TEMPLATE_INVOICE','EMAIL_TEMPLATE_SUBSCRIPTION_CONFIRMED']

export default function EmailConfigPage() {
  const [keys, setKeys] = useState<Record<string, ConfigKey>>({})
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [tab, setTab] = useState<'smtp' | 'templates'>('smtp')

  // SMTP state
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({})
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpSaved, setSmtpSaved] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; preview?: string } | null>(null)

  // Template state
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({})
  const [templateSaving, setTemplateSaving] = useState<Record<string, boolean>>({})
  const [templateSaved, setTemplateSaved] = useState<Record<string, boolean>>({})
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const previewRefs = useRef<Record<string, HTMLIFrameElement | null>>({})

  async function fetchAll() {
    setIsLoading(true); setFetchError(null)
    try {
      const [keysRes, tmplRes] = await Promise.all([
        api.get<Record<string, ConfigKey[]>>(API_ENDPOINTS.CONFIG_KEYS),
        api.get<EmailTemplate[]>(API_ENDPOINTS.CONFIG_EMAIL_TEMPLATES),
      ])
      const flat: Record<string, ConfigKey> = {}
      Object.values(keysRes).flat().forEach((k) => { flat[k.key] = k })
      setKeys(flat)
      const d: Record<string, string> = {}
      SMTP_FIELDS.forEach(({ key }) => { d[key] = flat[key]?.value ?? '' })
      d['SMTP_PROVIDER'] = flat['SMTP_PROVIDER']?.value ?? 'smtp'
      d['SMTP_SECURE'] = flat['SMTP_SECURE']?.value ?? 'false'
      setDrafts(d)
      setTemplates(tmplRes)
      const td: Record<string, string> = {}
      tmplRes.forEach((t) => { td[t.key] = t.value })
      setTemplateDrafts(td)
      if (!activeTemplate && tmplRes.length > 0) setActiveTemplate(tmplRes[0].key)
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Update preview iframe whenever draft changes
  useEffect(() => {
    if (!activeTemplate) return
    const iframe = previewRefs.current[activeTemplate]
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open(); doc.write(templateDrafts[activeTemplate] ?? '<p style="color:#666;font-family:sans-serif;padding:20px">No content yet</p>'); doc.close()
  }, [templateDrafts, activeTemplate])

  async function saveKey(key: string, value: string) {
    setSaving((s) => ({ ...s, [key]: true }))
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
    setSmtpSaving(true); setSmtpSaved(false)
    try {
      await Promise.all([
        ...SMTP_FIELDS.map(({ key }) => saveKey(key, drafts[key] ?? '')),
        saveKey('SMTP_PROVIDER', drafts['SMTP_PROVIDER'] ?? 'smtp'),
        saveKey('SMTP_SECURE', drafts['SMTP_SECURE'] ?? 'false'),
      ])
      setSmtpSaved(true)
      setTimeout(() => setSmtpSaved(false), 3000)
    } finally {
      setSmtpSaving(false)
    }
  }

  async function sendTestEmail() {
    if (!testTo.trim()) return
    setIsTesting(true); setTestResult(null)
    try {
      const res = await api.post<{ success: boolean; messageId?: string; preview?: string; error?: string }>(
        API_ENDPOINTS.CONFIG_EMAIL_TEST, { to: testTo },
      )
      setTestResult({ success: res.success, message: res.success ? `Sent! ID: ${res.messageId}` : res.error, preview: res.preview })
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
    } finally {
      setTemplateSaving((s) => ({ ...s, [key]: false }))
    }
  }

  const S = 'animate-pulse bg-slate-700 rounded'
  const provider = drafts['SMTP_PROVIDER'] ?? 'smtp'
  const activeTemplateData = templates.find((t) => t.key === activeTemplate)
  const activeMeta = activeTemplate ? TEMPLATE_META[activeTemplate] : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Email Configuration</h1>
          <p className="text-sm text-slate-400 mt-1">Configure SMTP delivery and manage email templates with live preview.</p>
        </div>
        <Button variant="secondary" size="sm" isLoading={isLoading} loadingText="Loading..." onClick={fetchAll} disabled={isLoading} className="shrink-0">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </div>

      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" /><span>{fetchError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl w-fit border border-slate-700">
        {([['smtp', <Mail key="m" className="h-4 w-4" />, 'SMTP & Delivery'], ['templates', <Code2 key="c" className="h-4 w-4" />, 'Email Templates']] as const).map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t as 'smtp' | 'templates')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* SMTP TAB */}
      {tab === 'smtp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT: SMTP form */}
          <div className="space-y-5">
            {/* Provider */}
            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-5 space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2"><Server className="h-4 w-4 text-indigo-400" />Email Provider</h3>
              <div className="grid grid-cols-2 gap-3">
                {PROVIDER_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    onClick={() => setDrafts((d) => ({ ...d, SMTP_PROVIDER: opt.value }))}
                    className={`text-left p-3.5 rounded-xl border transition-all ${provider === opt.value ? 'border-indigo-500 bg-indigo-900/30' : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`h-3 w-3 rounded-full border-2 ${provider === opt.value ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'}`} />
                      <span className="text-white text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP fields */}
            {provider === 'smtp' && (
              <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-5 space-y-4">
                <h3 className="font-semibold text-white flex items-center gap-2"><Server className="h-4 w-4 text-indigo-400" />SMTP Settings</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SMTP_FIELDS.map(({ key, label, type, placeholder, colSpan }) => {
                    const isPass = type === 'password'
                    return (
                      <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
                        <label className="block text-xs text-slate-400 mb-1 flex items-center justify-between">
                          <span>{label}</span>
                          {isPass && <button onClick={() => setShowPass((s) => !s)} className="text-slate-500 hover:text-white text-xs">{showPass ? 'Hide' : 'Show'}</button>}
                        </label>
                        {isLoading ? <div className={`${S} h-9`} /> : (
                          <input
                            type={isPass && !showPass ? 'password' : type === 'password' ? 'text' : type}
                            value={drafts[key] ?? ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                            className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500"
                            placeholder={keys[key]?.has_value && isPass ? '(keep existing)' : placeholder}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
                {/* TLS */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDrafts((d) => ({ ...d, SMTP_SECURE: d['SMTP_SECURE'] === 'true' ? 'false' : 'true' }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${drafts['SMTP_SECURE'] === 'true' ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${drafts['SMTP_SECURE'] === 'true' ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-300">Use TLS (enable for port 465)</span>
                </div>
                {smtpSaved && <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" />SMTP settings saved</div>}
                <Button variant="primary" isLoading={smtpSaving} loadingText="Saving..." onClick={saveAllSmtp} className="w-full">
                  Save SMTP Settings
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT: Test email + guide */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-5 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Send className="h-4 w-4 text-indigo-400" />Send Test Email</h3>
              <p className="text-xs text-slate-400">Verify your delivery config by sending a test message.</p>
              <div className="flex gap-2">
                <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="your@email.com"
                  className="flex-1 bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500" />
                <Button size="sm" isLoading={isTesting} loadingText="Sending..." onClick={sendTestEmail} disabled={!testTo.includes('@')}>
                  Send Test
                </Button>
              </div>
              {testResult && (
                <div className={`rounded-lg p-3 ${testResult.success ? 'bg-emerald-900/30 border border-emerald-700/40' : 'bg-red-900/30 border border-red-700/40'}`}>
                  <p className={`text-sm font-medium ${testResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                    {testResult.success ? 'Test email sent successfully' : 'Test email failed'}
                  </p>
                  <p className={`text-xs mt-1 ${testResult.success ? 'text-emerald-400/70' : 'text-red-400/70'}`}>{testResult.message}</p>
                  {testResult.preview && (
                    <a href={testResult.preview} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline mt-1 block">
                      Preview email (Ethereal) &rarr;
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5 space-y-3">
              <p className="text-sm font-medium text-white">Common SMTP Providers</p>
              <div className="space-y-2 text-xs text-slate-400">
                {[
                  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: '587', user: 'apikey', pass: 'SG.xxx key' },
                  { name: 'Mailgun', host: 'smtp.mailgun.org', port: '587', user: 'postmaster@...', pass: 'API key' },
                  { name: 'Gmail', host: 'smtp.gmail.com', port: '587', user: 'your@gmail.com', pass: 'App password' },
                  { name: 'AWS SES', host: 'email-smtp.us-east-1.amazonaws.com', port: '587', user: 'SMTP IAM User', pass: 'SMTP Password' },
                ].map((p) => (
                  <div key={p.name} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/40">
                    <p className="text-slate-200 font-medium">{p.name}</p>
                    <p>Host: <code className="text-sky-300">{p.host}</code> Port: <code className="text-sky-300">{p.port}</code></p>
                    <p>User: {p.user} | Pass: {p.pass}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Click a template to edit. Use <code className="bg-slate-700 px-1.5 rounded text-indigo-300 text-xs">{'{{VARIABLE}}'}</code> placeholders — swapped at send time.
            The preview updates live as you type.
          </p>

          {/* Template selector row */}
          <div className="flex flex-wrap gap-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={`${S} h-9 w-44`} />)
              : TEMPLATE_ORDER.filter((k) => TEMPLATE_META[k]).map((k) => {
                  const meta = TEMPLATE_META[k]
                  const tmpl = templates.find((t) => t.key === k)
                  if (!tmpl) return null
                  const isActive = activeTemplate === k
                  return (
                    <button key={k} onClick={() => setActiveTemplate(k)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${isActive ? `bg-slate-700 ${meta.color} border-current` : 'border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                      {meta.label}
                    </button>
                  )
                })
            }
          </div>

          {/* Split editor/preview */}
          {activeTemplate && activeMeta && !isLoading && (
            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 overflow-hidden">
              {/* Template header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
                <div>
                  <h3 className={`font-semibold ${activeMeta.color.split(' ')[0]}`}>{activeMeta.label}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {activeMeta.vars.map((v) => (
                      <code key={v} className="text-[10px] font-mono bg-slate-900 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-700/40">
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {templateSaved[activeTemplate] && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Saved</span>}
                  <Button size="sm" isLoading={templateSaving[activeTemplate]} loadingText="Saving..." onClick={() => saveTemplate(activeTemplate)}>
                    Save Template
                  </Button>
                </div>
              </div>

              {/* Split pane: editor (left) + preview (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/40" style={{ minHeight: '520px' }}>
                {/* Editor */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border-b border-slate-700/40">
                    <Code2 className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs text-slate-400">HTML Editor</span>
                  </div>
                  <textarea
                    value={templateDrafts[activeTemplate] ?? ''}
                    onChange={(e) => setTemplateDrafts((d) => ({ ...d, [activeTemplate]: e.target.value }))}
                    className="flex-1 w-full bg-slate-950 text-slate-200 text-xs font-mono px-4 py-3 outline-none resize-none border-0 focus:ring-0"
                    spellCheck={false}
                    style={{ minHeight: '480px' }}
                  />
                </div>

                {/* Live preview */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs text-slate-400">Live Preview</span>
                    </div>
                    <button
                      onClick={() => {
                        const w = window.open('', '_preview_' + activeTemplate)
                        if (w) { w.document.write(templateDrafts[activeTemplate] ?? ''); w.document.close() }
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Maximize2 className="h-3 w-3" />Open full
                    </button>
                  </div>
                  <div className="flex-1 bg-white overflow-hidden">
                    <iframe
                      ref={(el) => { if (activeTemplate) previewRefs.current[activeTemplate] = el }}
                      title={`preview-${activeTemplate}`}
                      className="w-full h-full border-0"
                      style={{ minHeight: '480px' }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && templates.length === 0 && (
            <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-12 text-center">
              <p className="text-slate-400">No templates found. Run the database migration to seed default templates.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
