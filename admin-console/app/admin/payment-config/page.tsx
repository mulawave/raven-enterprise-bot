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
  updated_at: string
}

const PAYMENT_KEYS = [
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_TEST_SECRET_KEY',
  'PAYSTACK_TEST_PUBLIC_KEY',
  'PAYMENT_CALLBACK_URL',
  'PAYMENT_LIVE_MODE',
]

// Keys shown only in live mode tab
const LIVE_KEYS = ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY']
// Keys shown only in test mode tab
const TEST_KEYS = ['PAYSTACK_TEST_SECRET_KEY', 'PAYSTACK_TEST_PUBLIC_KEY']

export default function PaymentConfigPage() {
  const [keys, setKeys] = useState<Record<string, ConfigKey>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Draft values (one per key)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({})

  const isLive = (keys['PAYMENT_LIVE_MODE']?.value ?? 'false') === 'true'

  async function fetchKeys() {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await api.get<Record<string, ConfigKey[]>>(API_ENDPOINTS.CONFIG_KEYS)
      const flat: Record<string, ConfigKey> = {}
      Object.values(res).flat().forEach((k) => { flat[k.key] = k })
      setKeys(flat)
      const d: Record<string, string> = {}
      Object.values(flat).forEach((k) => { d[k.key] = '' }) // drafts start empty (don't show masked vals)
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
      setDrafts((d) => ({ ...d, [key]: '' }))
    } catch (err: any) {
      setSaveErrors((e) => ({ ...e, [key]: err.message || 'Save failed' }))
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  async function toggleLiveMode() {
    const next = isLive ? 'false' : 'true'
    await save('PAYMENT_LIVE_MODE', next)
  }

  const SHIMMER = 'animate-pulse bg-slate-700 rounded'

  function KeyRow({ keyName }: { keyName: string }) {
    const cfg = keys[keyName]
    if (!cfg) return null
    const isSaving = saving[keyName]
    const err = saveErrors[keyName]
    const ok = saveSuccess[keyName]

    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <span className="font-mono text-xs text-indigo-300">{keyName}</span>
            {cfg.has_value && (
              <span className="ml-2 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">● Set</span>
            )}
          </div>
          {cfg.is_secret && (
            <button
              onClick={() => setShow((s) => ({ ...s, [keyName]: !s[keyName] }))}
              className="text-xs text-slate-400 hover:text-white transition-colors shrink-0"
            >
              {show[keyName] ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {cfg.description && <p className="text-xs text-slate-500 mb-3">{cfg.description}</p>}

        <div className="flex gap-2">
          <input
            type={cfg.is_secret && !show[keyName] ? 'password' : 'text'}
            value={drafts[keyName] ?? ''}
            onChange={(e) => setDrafts((d) => ({ ...d, [keyName]: e.target.value }))}
            className="flex-1 bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none placeholder-slate-500"
            placeholder={cfg.has_value ? '(keep existing — type to replace)' : 'Enter value…'}
          />
          <Button
            size="sm"
            variant="primary"
            isLoading={isSaving}
            loadingText="Saving…"
            onClick={() => save(keyName, drafts[keyName] ?? '')}
            disabled={!drafts[keyName]?.trim()}
          >
            Save
          </Button>
        </div>
        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
        {ok && <p className="text-green-400 text-xs mt-2">Saved</p>}
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Configuration</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configure Paystack keys for sandbox testing and live production payments
        </p>
      </div>

      {fetchError && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-300 text-sm">{fetchError}</span>
          <Button size="sm" variant="secondary" onClick={fetchKeys}>Retry</Button>
        </div>
      )}

      {/* Live / Test mode toggle */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Payment Mode</h2>
            <p className="text-slate-400 text-sm mt-1">
              {isLoading
                ? 'Loading…'
                : isLive
                ? '🟢 Live — real money transactions enabled'
                : '🟡 Sandbox — test mode, no real charges'}
            </p>
          </div>
          {isLoading ? (
            <div className={`${SHIMMER} h-8 w-24`} />
          ) : (
            <Button
              variant={isLive ? 'danger' : 'primary'}
              size="sm"
              isLoading={saving['PAYMENT_LIVE_MODE']}
              loadingText="Switching…"
              onClick={toggleLiveMode}
            >
              {isLive ? 'Switch to Sandbox' : 'Enable Live Mode'}
            </Button>
          )}
        </div>

        {!isLoading && isLive && (
          <div className="mt-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
            <p className="text-yellow-300 text-xs">
              ⚠️ Live mode is active. Transactions will charge real cards. Ensure your live Paystack keys are correctly set.
            </p>
          </div>
        )}
      </div>

      {/* Live keys */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-slate-600'}`} />
          <h2 className="text-white font-semibold">Live Keys</h2>
          {isLive && <span className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full">Active</span>}
        </div>
        <p className="text-slate-400 text-xs -mt-2">Used when live mode is enabled. Starts with sk_live_... / pk_live_...</p>
        {isLoading
          ? [1, 2].map((i) => <div key={i} className={`${SHIMMER} h-16 w-full`} />)
          : LIVE_KEYS.map((k) => <KeyRow key={k} keyName={k} />)
        }
      </div>

      {/* Test / Sandbox keys */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${!isLive ? 'bg-yellow-400' : 'bg-slate-600'}`} />
          <h2 className="text-white font-semibold">Sandbox / Test Keys</h2>
          {!isLive && <span className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded-full">Active</span>}
        </div>
        <p className="text-slate-400 text-xs -mt-2">Used in sandbox mode. Starts with sk_test_... / pk_test_...</p>
        {isLoading
          ? [1, 2].map((i) => <div key={i} className={`${SHIMMER} h-16 w-full`} />)
          : TEST_KEYS.map((k) => <KeyRow key={k} keyName={k} />)
        }
      </div>

      {/* Callback URL */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Callback URL</h2>
        <p className="text-slate-400 text-xs">Paystack redirects here after payment. Must match what is set in the Paystack dashboard.</p>
        {isLoading
          ? <div className={`${SHIMMER} h-16 w-full`} />
          : <KeyRow keyName="PAYMENT_CALLBACK_URL" />
        }
      </div>

      {/* Info */}
      <p className="text-slate-500 text-xs">
        Keys are cached for up to 60 seconds after saving. Restart the backend for immediate effect.
        Get your keys from <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Paystack Dashboard → Developer</a>.
      </p>
    </div>
  )
}
