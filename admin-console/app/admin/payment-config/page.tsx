'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import { Button } from '@/components/Button'
import { CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, Info, ShieldCheck, FlaskConical, Zap } from 'lucide-react'

interface ConfigKey {
  key: string
  value: string
  description: string
  is_secret: boolean
  has_value: boolean
  updated_at: string
}

const LIVE_KEYS = ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY']
const TEST_KEYS = ['PAYSTACK_TEST_SECRET_KEY', 'PAYSTACK_TEST_PUBLIC_KEY']
const FLW_KEYS = ['FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_PUBLIC_KEY', 'FLUTTERWAVE_WEBHOOK_SECRET', 'FLUTTERWAVE_MERCHANT_ID']

export default function PaymentConfigPage() {
  const [keys, setKeys] = useState<Record<string, ConfigKey>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({})

  const isLive = (keys['PAYMENT_LIVE_MODE']?.value ?? 'false') === 'true'

  async function fetchKeys() {
    setIsLoading(true); setFetchError(null)
    try {
      const res = await api.get<Record<string, ConfigKey[]>>(API_ENDPOINTS.CONFIG_KEYS)
      const flat: Record<string, ConfigKey> = {}
      Object.values(res).flat().forEach((k) => { flat[k.key] = k })
      setKeys(flat)
      const d: Record<string, string> = {}
      Object.values(flat).forEach((k) => {
        d[k.key] = k.value ?? ''
      })
      setDrafts(d)
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load config')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [])

  async function save(key: string, value: string) {
    setSaving((s) => ({ ...s, [key]: true }))
    setSaveErrors((e) => ({ ...e, [key]: '' }))
    setSaveSuccess((s) => ({ ...s, [key]: false }))
    try {
      await api.patch(`${API_ENDPOINTS.CONFIG_KEYS}/${key}`, { value: value || null })
      setSaveSuccess((s) => ({ ...s, [key]: true }))
      setTimeout(() => setSaveSuccess((s) => ({ ...s, [key]: false })), 3000)
      await fetchKeys()
    } catch (err: any) {
      setSaveErrors((e) => ({ ...e, [key]: err.message || 'Save failed' }))
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  async function toggleLiveMode() {
    await save('PAYMENT_LIVE_MODE', isLive ? 'false' : 'true')
  }

  const S = 'animate-pulse bg-slate-700 rounded'

  function KeyField({ keyName }: { keyName: string }) {
    const cfg = keys[keyName]
    if (!cfg) return <div className={`${S} h-16 w-full`} />
    const isSav = saving[keyName]
    const err = saveErrors[keyName]
    const ok = saveSuccess[keyName]
    const draft = drafts[keyName] ?? ''

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">{keyName}</code>
          {cfg.has_value && (
            <span className="text-[10px] text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-700/30 inline-flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> saved
            </span>
          )}
        </div>
        {cfg.description && <p className="text-xs text-slate-500">{cfg.description}</p>}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={cfg.is_secret && !show[keyName] ? 'password' : 'text'}
              value={draft}
              onChange={(e) => setDrafts((d) => ({ ...d, [keyName]: e.target.value }))}
              className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-sky-500 outline-none placeholder-slate-600 font-mono pr-10"
              placeholder="Enter value..."
            />
            {cfg.is_secret && (
              <button type="button" onClick={() => setShow((s) => ({ ...s, [keyName]: !s[keyName] }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {show[keyName] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
          <Button size="sm" isLoading={isSav} loadingText="Saving..." onClick={() => save(keyName, draft)} disabled={!draft.trim()}>
            Save
          </Button>
        </div>
        {err && <p className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />{err}</p>}
        {ok && <p className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Saved</p>}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Payment Configuration</h1>
        <p className="text-sm text-slate-400 mt-1">Configure Paystack and Flutterwave API keys for payments, subscriptions, and payouts.</p>
      </div>

      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{fetchError}</span>
          <Button size="sm" variant="secondary" onClick={fetchKeys} className="ml-auto">Retry</Button>
        </div>
      )}

      {/* Mode banner */}
      <div className={`rounded-2xl border p-5 flex items-center justify-between ${isLive ? 'bg-green-900/20 border-green-600/40' : 'bg-amber-900/20 border-amber-600/40'}`}>
        <div className="flex items-center gap-3">
          {isLive
            ? <ShieldCheck className="h-6 w-6 text-green-400" />
            : <FlaskConical className="h-6 w-6 text-amber-400" />
          }
          <div>
            <p className={`font-semibold ${isLive ? 'text-green-300' : 'text-amber-300'}`}>
              {isLoading ? 'Loading...' : isLive ? 'Live Mode Active' : 'Sandbox / Test Mode Active'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isLive ? 'Real money transactions are enabled. Charges are live.' : 'No real charges. Use Paystack test cards.'}
            </p>
          </div>
        </div>
        {!isLoading && (
          <Button
            variant={isLive ? 'danger' : 'primary'}
            size="sm"
            isLoading={saving['PAYMENT_LIVE_MODE']}
            loadingText="Switching..."
            onClick={toggleLiveMode}
            className="shrink-0 ml-4"
          >
            {isLive ? 'Switch to Sandbox' : 'Enable Live Mode'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Live keys + Test keys + Callback */}
        <div className="space-y-5">
          {/* Live keys */}
          <div className={`rounded-2xl border bg-slate-800/60 p-5 space-y-4 ${isLive ? 'border-green-600/40' : 'border-slate-700/40'}`}>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-400' : 'bg-slate-600'}`} />
              <h3 className="font-semibold text-white">Live Keys</h3>
              {isLive && <span className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full border border-green-700/30">Active</span>}
            </div>
            <p className="text-xs text-slate-500">sk_live_ / pk_live_ — used when Live Mode is on.</p>
            {isLoading
              ? [1, 2].map((i) => <div key={i} className={`${S} h-16 w-full`} />)
              : LIVE_KEYS.map((k) => <KeyField key={k} keyName={k} />)
            }
          </div>

          {/* Test keys */}
          <div className={`rounded-2xl border bg-slate-800/60 p-5 space-y-4 ${!isLive ? 'border-amber-600/40' : 'border-slate-700/40'}`}>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${!isLive ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <h3 className="font-semibold text-white">Sandbox / Test Keys</h3>
              {!isLive && <span className="text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-700/30">Active</span>}
            </div>
            <p className="text-xs text-slate-500">sk_test_ / pk_test_ — used when Sandbox Mode is on.</p>
            {isLoading
              ? [1, 2].map((i) => <div key={i} className={`${S} h-16 w-full`} />)
              : TEST_KEYS.map((k) => <KeyField key={k} keyName={k} />)
            }
          </div>

          {/* Callback URL */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-5 space-y-3">
            <h3 className="font-semibold text-white">Callback URL</h3>
            <p className="text-xs text-slate-500">Paystack redirects here after payment completes. Must match the Paystack dashboard setting.</p>
            {isLoading ? <div className={`${S} h-16 w-full`} /> : <KeyField keyName="PAYMENT_CALLBACK_URL" />}
          </div>
        </div>

        {/* RIGHT: Flutterwave + tips */}
        <div className="space-y-5">

          {/* Flutterwave keys */}
          <div className="rounded-2xl border border-orange-700/40 bg-slate-800/60 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400" />
              <h3 className="font-semibold text-white">Flutterwave</h3>
              <span className="text-xs bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded-full border border-orange-700/30">Payments, Plans &amp; Payouts</span>
            </div>
            <p className="text-xs text-slate-500">
              Used for processing payments, managing subscription plans, and bank payout transfers.
              Get your keys from the <span className="text-orange-300">Flutterwave Dashboard → Settings → API</span>.
            </p>
            {isLoading
              ? [1, 2, 3, 4].map((i) => <div key={i} className={`${S} h-16 w-full`} />)
              : FLW_KEYS.map((k) => <KeyField key={k} keyName={k} />)
            }
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-sky-400" />Setup Guide
            </h3>
            <ol className="text-xs text-slate-400 space-y-3 list-none">
              <li className="flex gap-2"><span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Log in to your <span className="text-sky-300">Paystack Dashboard</span> and go to <strong className="text-slate-200">Settings ➜ API Keys and Webhooks</strong>.</span></li>
              <li className="flex gap-2"><span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Copy your <strong className="text-amber-300">Test Secret Key</strong> and <strong className="text-amber-300">Test Public Key</strong> for sandbox testing.</span></li>
              <li className="flex gap-2"><span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>When ready for production, copy the <strong className="text-green-300">Live Secret Key</strong> and <strong className="text-green-300">Live Public Key</strong> and toggle to Live Mode.</span></li>
              <li className="flex gap-2"><span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">4</span>
                <span>Set the <strong className="text-slate-200">Callback URL</strong> to match the one in your Paystack Webhook settings (e.g. <code className="font-mono text-sky-300">https://app.raven-ai.online/payments/verify</code>).</span></li>
              <li className="flex gap-2"><span className="bg-orange-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">5</span>
                <span>For <strong className="text-orange-300">Flutterwave</strong> (payments, plans &amp; payouts), log in to the <span className="text-orange-300">Flutterwave Dashboard</span> ➜ <strong className="text-slate-200">Settings ➜ API</strong>. Copy your Secret Key (<code className="font-mono text-slate-300">FLWSECK_...</code>), Public Key (<code className="font-mono text-slate-300">FLWPUBK_...</code>), Webhook Secret, and Merchant ID.</span></li>
            </ol>
            <div className="flex gap-3 flex-wrap">
              <a
                href="https://dashboard.paystack.com/#/settings/developers"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />Paystack Developer Settings
              </a>
              <a
                href="https://app.flutterwave.com/dashboard/settings/apis"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />Flutterwave API Settings
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5 space-y-2">
            <p className="text-xs font-medium text-amber-400">Important Notes</p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Never share secret keys. They authorize charges directly.</li>
              <li>Keys are applied within 60 seconds of saving (config cache).</li>
              <li>Test mode and Live mode use completely separate key sets.</li>
              <li>Paystack test card: <code className="font-mono text-slate-300">4084 0840 8408 4081</code> (any future exp, CVV 408).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
