'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import Button from '@/components/Button'
import { Eye, EyeOff, Check, AlertCircle, RefreshCw, Key, MessageSquare, CreditCard, Brain, Mail } from 'lucide-react'

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

const GROUP_META: Record<string, { label: string; icon: React.ComponentType<any>; description: string; color: string }> = {
  whatsapp: {
    label: 'WhatsApp / Meta API',
    icon: MessageSquare,
    description: 'Credentials for Meta Business API, webhooks, and WhatsApp messaging.',
    color: 'from-green-500/20 to-emerald-500/10 border-green-600/30',
  },
  payment: {
    label: 'Payment Gateway',
    icon: CreditCard,
    description: 'Paystack API keys and payment callback configuration.',
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-600/30',
  },
  ai: {
    label: 'AI / OpenAI',
    icon: Brain,
    description: 'OpenAI API key used for AI assistant and automated responses.',
    color: 'from-purple-500/20 to-violet-500/10 border-purple-600/30',
  },
  email: {
    label: 'Email & SMTP',
    icon: Mail,
    description: 'SMTP server settings and email delivery provider configuration.',
    color: 'from-orange-500/20 to-amber-500/10 border-orange-600/30',
  },
}

const MASKED_DISPLAY = '••••••••••••'

function KeyRow({ item, onSaved }: { item: ConfigKey; onSaved: (updated: ConfigKey) => void }) {
  const [value, setValue] = useState(item.has_value && item.is_secret ? '' : item.value)
  const [showSecret, setShowSecret] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const handleChange = (v: string) => {
    setValue(v)
    setIsDirty(true)
    setError(null)
    setSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated: ConfigKey = await api.patch(`/admin/config/keys/${item.key}`, {
        value: value.trim() === '' ? null : value.trim(),
      })
      onSaved(updated)
      setIsDirty(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.message ?? 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const displayedValue = () => {
    if (!item.is_secret) return value
    if (showSecret) return value
    if (item.has_value && value === '') return MASKED_DISPLAY
    return value
  }

  return (
    <div className="py-4 border-b border-gray-700/50 last:border-0">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-xs font-mono text-blue-300 bg-blue-900/20 px-2 py-0.5 rounded">
              {item.key}
            </code>
            {item.is_secret && (
              <span className="text-xs text-yellow-400 bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-700/30">
                secret
              </span>
            )}
            {item.has_value && (
              <span className="text-xs text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-700/30 flex items-center gap-1">
                <Check className="h-2.5 w-2.5" />
                set
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 mb-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={item.is_secret && !showSecret ? 'password' : 'text'}
                value={displayedValue()}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => {
                  // Clear masked placeholder on focus for secret fields
                  if (item.is_secret && value === '') setIsDirty(false)
                }}
                placeholder={item.has_value && item.is_secret ? '(keep existing — or type to replace)' : `Enter ${item.key}`}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono pr-10 transition-colors"
              />
              {item.is_secret && (
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  title={showSecret ? 'Hide' : 'Show'}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            <Button
              size="sm"
              isLoading={isSaving}
              loadingText="Saving…"
              onClick={handleSave}
              disabled={isSaving || (!isDirty && item.has_value)}
              className={isDirty ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Save
            </Button>
          </div>
          {error && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
          {success && (
            <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Saved
            </p>
          )}
        </div>
      </div>
      {item.updated_at && (
        <p className="mt-1 text-[10px] text-gray-600">
          Last updated: {new Date(item.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}

function GroupCard({
  groupKey,
  items,
  onKeyUpdated,
}: {
  groupKey: string
  items: ConfigKey[]
  onKeyUpdated: (key: string, updated: ConfigKey) => void
}) {
  const meta = GROUP_META[groupKey] ?? {
    label: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
    icon: Key,
    description: '',
    color: 'from-gray-500/20 to-gray-500/10 border-gray-600/30',
  }
  const Icon = meta.icon

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${meta.color} backdrop-blur-sm`}>
      <div className="p-5 border-b border-gray-700/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800/60">
            <Icon className="h-5 w-5 text-gray-200" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{meta.label}</h3>
            {meta.description && (
              <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">
        {items.map((item) => (
          <KeyRow
            key={item.key}
            item={item}
            onSaved={(updated) => onKeyUpdated(item.key, updated)}
          />
        ))}
      </div>
    </div>
  )
}

export default function ApiKeysPage() {
  const [config, setConfig] = useState<GroupedConfig>({})
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const data = await api.get<GroupedConfig>('/admin/config/keys')
      setConfig(data)
    } catch (err: any) {
      setFetchError(err?.message ?? 'Failed to load configuration')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleKeyUpdated = (groupKey: string, key: string, updated: ConfigKey) => {
    setConfig((prev) => ({
      ...prev,
      [groupKey]: (prev[groupKey] ?? []).map((item) =>
        item.key === key ? { ...updated } : item
      ),
    }))
  }

  const GROUP_ORDER = ['whatsapp', 'payment', 'ai', 'email']
  const orderedGroups = [
    ...GROUP_ORDER.filter((g) => config[g]),
    ...Object.keys(config).filter((g) => !GROUP_ORDER.includes(g)),
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">API Keys</h1>
          <p className="text-sm text-gray-400 mt-1">
            Integration credentials and API keys. Secrets are masked — enter a new value to replace.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isLoading={isLoading}
          loadingText="Refreshing…"
          onClick={fetchConfig}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Failed to load configuration</p>
            <p className="text-red-400 mt-0.5">{fetchError}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-gray-800/50 border border-gray-700/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {orderedGroups.map((groupKey) => (
            <GroupCard
              key={groupKey}
              groupKey={groupKey}
              items={config[groupKey] ?? []}
              onKeyUpdated={(key, updated) => handleKeyUpdated(groupKey, key, updated)}
            />
          ))}
          {orderedGroups.length === 0 && !fetchError && (
            <div className="text-center py-12 text-gray-500">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No configuration keys found.</p>
              <p className="text-sm mt-1">Run the migration to seed the default keys.</p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-4 text-sm text-blue-300">
        <p className="font-medium mb-1">Important</p>
        <ul className="space-y-1 text-blue-400 text-xs list-disc list-inside">
          <li>Changes take effect immediately — services pick up new values within 60 seconds (next cache refresh).</li>
          <li>Secret values (marked <span className="text-yellow-400">secret</span>) are masked after saving.</li>
          <li>Infrastructure secrets (DATABASE_URL, JWT_SECRET, REDIS_URL) are managed via <code className="font-mono">.env</code> only.</li>
        </ul>
      </div>
    </div>
  )
}
