'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import Button from '@/components/Button'
import {
  Eye, EyeOff, Check, AlertCircle, RefreshCw, Key, MessageSquare, Brain, Info,
} from 'lucide-react'

interface ConfigKey {
  id: string
  key: string
  value: string
  description: string | null
  group: string
  is_secret: boolean
  has_value: boolean
  updated_at: string
}

type GroupedConfig = Record<string, ConfigKey[]>

// Only whatsapp + ai live here. Payment -> /admin/payment-config.  Email/SMTP -> /admin/email-config.
const GROUP_META: Record<string, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  accent: string
  badge: string
}> = {
  whatsapp: {
    label: 'WhatsApp / Meta API',
    icon: MessageSquare,
    description: 'App Secret, Webhook Verify Token, permanent Access Token, and Phone Number ID from the Meta Business platform.',
    accent: 'border-emerald-500/40',
    badge: 'bg-emerald-500/15 text-emerald-300',
  },
  ai: {
    label: 'AI / OpenAI',
    icon: Brain,
    description: 'OpenAI API key used by the AI assistant for automated WhatsApp responses.',
    accent: 'border-violet-500/40',
    badge: 'bg-violet-500/15 text-violet-300',
  },
}

const VISIBLE_GROUPS = ['whatsapp', 'ai']

function KeyRow({ item, onSaved }: { item: ConfigKey; onSaved: (updated: ConfigKey) => void }) {
  const [value, setValue] = useState(item.has_value && item.is_secret ? '' : (item.value ?? ''))
  const [show, setShow] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleChange = (v: string) => { setValue(v); setDirty(true); setError(null); setSuccess(false) }

  const handleSave = async () => {
    setIsSaving(true); setError(null); setSuccess(false)
    try {
      const updated: ConfigKey = await api.patch(`/admin/config/keys/${item.key}`, {
        value: value.trim() === '' ? null : value.trim(),
      })
      onSaved(updated)
      setDirty(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.message ?? 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="py-3.5 border-b border-slate-700/40 last:border-0">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <code className="text-xs font-mono text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
          {item.key}
        </code>
        {item.is_secret && (
          <span className="text-[10px] text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-700/30">
            secret
          </span>
        )}
        {item.has_value && (
          <span className="text-[10px] text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-700/30 inline-flex items-center gap-1">
            <Check className="h-2.5 w-2.5" /> saved
          </span>
        )}
      </div>
      {item.description && (
        <p className="text-xs text-slate-400 mb-2 leading-relaxed">{item.description}</p>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={item.is_secret && !show ? 'password' : 'text'}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={item.has_value && item.is_secret ? 'Saved \u2014 type a new value to replace' : `Enter ${item.key}`}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 outline-none font-mono pr-10 transition-colors"
          />
          {item.is_secret && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        <Button
          size="sm"
          isLoading={isSaving}
          loadingText="Saving..."
          onClick={handleSave}
          disabled={isSaving || (!dirty && item.has_value)}
          className={dirty ? 'bg-sky-600 hover:bg-sky-700 shrink-0' : 'shrink-0'}
        >
          Save
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
      {success && <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" />Saved</p>}
      {item.updated_at && (
        <p className="mt-1 text-[10px] text-slate-600">
          Last updated: {new Date(item.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}

function GroupCard({
  groupKey, items, onKeyUpdated, isLoading,
}: {
  groupKey: string
  items: ConfigKey[]
  onKeyUpdated: (key: string, updated: ConfigKey) => void
  isLoading: boolean
}) {
  const meta = GROUP_META[groupKey] ?? { label: groupKey, icon: Key, description: '', accent: 'border-slate-600/40', badge: 'bg-slate-700 text-slate-300' }
  const Icon = meta.icon
  const setCount = items.filter((i) => i.has_value).length

  return (
    <div className={`rounded-2xl border bg-slate-800/60 backdrop-blur-sm ${meta.accent} flex flex-col`}>
      <div className="flex items-start justify-between p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-700/60">
            <Icon className="h-5 w-5 text-slate-200" />
          </div>
          <div>
            <h3 className="font-semibold text-white leading-tight">{meta.label}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{meta.description}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-4 ${meta.badge}`}>
          {setCount}/{items.length} set
        </span>
      </div>
      <div className="p-5 flex-1">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-3.5 border-b border-slate-700/40 last:border-0 space-y-2">
                <div className="h-5 w-40 bg-slate-700/60 rounded animate-pulse" />
                <div className="h-9 w-full bg-slate-700/40 rounded-lg animate-pulse" />
              </div>
            ))
          : items.map((item) => (
              <KeyRow key={item.key} item={item} onSaved={(updated) => onKeyUpdated(item.key, updated)} />
            ))
        }
      </div>
    </div>
  )
}

export default function ApiKeysPage() {
  const [config, setConfig] = useState<GroupedConfig>({})
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    setIsLoading(true); setFetchError(null)
    try {
      const data = await api.get<GroupedConfig>('/admin/config/keys')
      setConfig(data)
    } catch (err: any) {
      setFetchError(err?.message ?? 'Failed to load configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleKeyUpdated = (groupKey: string, key: string, updated: ConfigKey) => {
    setConfig((prev) => ({
      ...prev,
      [groupKey]: (prev[groupKey] ?? []).map((item) => item.key === key ? { ...updated } : item),
    }))
  }

  const visibleGroups = VISIBLE_GROUPS.filter((g) => config[g] || isLoading)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="text-sm text-slate-400 mt-1">
            Integration credentials for WhatsApp / Meta and OpenAI. Secret values are masked after saving.
          </p>
        </div>
        <Button variant="secondary" size="sm" isLoading={isLoading} loadingText="Refreshing..." onClick={fetchConfig} disabled={isLoading} className="shrink-0">
          <RefreshCw className="h-4 w-4" />Refresh
        </Button>
      </div>

      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Failed to load configuration</p>
            <p className="text-red-400/80 mt-0.5">{fetchError}</p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-sky-900/20 border border-sky-700/30 text-sm text-sky-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Payment gateway keys live in <a href="/admin/payment-config" className="underline hover:text-white">Payment Config</a>.
          SMTP and email templates live in <a href="/admin/email-config" className="underline hover:text-white">Email Config</a>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {visibleGroups.map((groupKey) => (
          <GroupCard
            key={groupKey}
            groupKey={groupKey}
            items={config[groupKey] ?? []}
            onKeyUpdated={(key, updated) => handleKeyUpdated(groupKey, key, updated)}
            isLoading={isLoading}
          />
        ))}

        <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Info className="h-4 w-4 text-sky-400" />Quick Reference
          </h3>
          <div className="space-y-3 text-xs text-slate-400">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/40 space-y-1">
              <p className="text-slate-200 font-medium">WhatsApp / Meta</p>
              <p>Find these in your Meta for Developers dashboard under the WhatsApp product.</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li><code className="font-mono text-sky-300">META_APP_SECRET</code> - App Settings - Basic</li>
                <li><code className="font-mono text-sky-300">META_ACCESS_TOKEN</code> - WhatsApp API Setup, permanent token</li>
                <li><code className="font-mono text-sky-300">META_PHONE_NUMBER_ID</code> - WhatsApp API Setup</li>
                <li><code className="font-mono text-sky-300">META_WEBHOOK_VERIFY_TOKEN</code> - any string you choose</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/40 space-y-1">
              <p className="text-slate-200 font-medium">OpenAI</p>
              <p>Create an API key at platform.openai.com/api-keys. Used for AI-assisted WhatsApp responses.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/40">
              <p className="text-amber-400 font-medium">Important</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li>Changes take effect within 60 seconds (config cache refresh).</li>
                <li>Infrastructure secrets (DATABASE_URL, JWT_SECRET) live in .env only.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
