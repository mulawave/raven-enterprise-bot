"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useTenantContext } from '@/lib/tenant-context'

interface BotSettings {
  enabled: boolean
  systemPrompt: string
  hasOpenAiKey: boolean
  hasWaConfig: boolean
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${ok ? 'bg-emerald-100' : 'bg-red-100'}`}>
        {ok ? (
          <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        )}
      </span>
      <span className={`text-xs font-medium ${ok ? 'text-emerald-700' : 'text-red-600'}`}>{label}</span>
    </div>
  )
}

function Shimmer({ className }: { className: string }) {
  return <div className={`rounded bg-gray-200 animate-pulse ${className}`} />
}

export default function BotsPage() {
  const { tenant } = useTenantContext()
  const [settings, setSettings] = useState<BotSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [faqCount, setFaqCount] = useState<number | null>(null)
  const [catCount, setCatCount] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Edit state
  const [enabled, setEnabled] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isTogglingBot, setIsTogglingBot] = useState(false)
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [botData, faqData, catData] = await Promise.allSettled([
        api<BotSettings>('/api/settings/bot'),
        api<unknown[]>('/api/faqs'),
        tenant?.id ? api<unknown[]>(`/api/ordering/menu/categories?tenantId=${tenant.id}`) : Promise.resolve([]),
      ])

      if (botData.status === 'fulfilled') {
        setSettings(botData.value)
        setEnabled(botData.value.enabled)
        setSystemPrompt(botData.value.systemPrompt ?? '')
      }
      if (faqData.status === 'fulfilled' && Array.isArray(faqData.value)) {
        setFaqCount(faqData.value.length)
      }
      if (catData.status === 'fulfilled' && Array.isArray(catData.value)) {
        setCatCount(catData.value.length)
      }
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [tenant?.id])

  useEffect(() => { if (tenant?.id) load() }, [tenant?.id])

  async function handleToggle(newEnabled: boolean) {
    setIsTogglingBot(true)
    try {
      await api('/api/settings/bot', {
        method: 'POST',
        body: JSON.stringify({ enabled: newEnabled }),
      })
      setEnabled(newEnabled)
      setSettings((s) => s ? { ...s, enabled: newEnabled } : s)
    } catch { showToast('Failed to update bot status', 'error') } finally {
      setIsTogglingBot(false)
    }
  }

  async function handleSavePrompt() {
    setIsSavingPrompt(true)
    setPromptSaved(false)
    try {
      await api('/api/settings/bot', {
        method: 'POST',
        body: JSON.stringify({ systemPrompt }),
      })
      setPromptSaved(true)
      setTimeout(() => setPromptSaved(false), 3000)
    } catch { showToast('Failed to save prompt', 'error') } finally {
      setIsSavingPrompt(false)
    }
  }

  const canEnable = settings?.hasOpenAiKey && settings?.hasWaConfig
  const promptChanged = settings !== null && systemPrompt !== (settings.systemPrompt ?? '')

  return (
    <div className="max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl border ${
          toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-red-600 text-white border-red-500'
        }`}>
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bots</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your AI bot that automatically responds to customer messages on WhatsApp.</p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-5">
        <p className="text-sm font-semibold text-gray-900 mb-4">Integration Status</p>
        {isLoading ? (
          <div className="space-y-3">
            <Shimmer className="h-4 w-48" />
            <Shimmer className="h-4 w-40" />
          </div>
        ) : (
          <div className="space-y-2.5">
            <StatusBadge
              ok={settings?.hasWaConfig ?? false}
              label={settings?.hasWaConfig ? 'WhatsApp connected' : 'WhatsApp not configured — add credentials in Settings'}
            />
            <StatusBadge
              ok={settings?.hasOpenAiKey ?? false}
              label={settings?.hasOpenAiKey ? 'OpenAI key configured' : 'OpenAI key missing — add OPENAI_API_KEY in Settings'}
            />
          </div>
        )}

        {!isLoading && !canEnable && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <svg className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-xs text-amber-700">
              The bot needs both WhatsApp and OpenAI configured before it can respond. Go to{' '}
              <Link href="/settings" className="font-semibold underline">Settings</Link> to add missing credentials.
            </p>
          </div>
        )}
      </div>

      {/* Enable / disable toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Auto-reply</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isLoading ? '…' : enabled ? 'Bot is active — replying to customer messages automatically' : 'Bot is paused — messages arrive but no automated reply is sent'}
            </p>
          </div>
          {isLoading ? (
            <Shimmer className="h-7 w-12" />
          ) : (
            <button
              onClick={() => handleToggle(!enabled)}
              disabled={isTogglingBot || (!canEnable && !enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
              title={!canEnable && !enabled ? 'Configure WhatsApp and OpenAI first' : undefined}
            >
              {isTogglingBot && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </span>
              )}
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'} ${isTogglingBot ? 'opacity-0' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* System prompt */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-5">
        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-900">Bot Personality</p>
          <p className="text-xs text-gray-500 mt-0.5">This prompt defines how the bot introduces itself and responds to customers. Keep it concise and professional.</p>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Shimmer className="h-3.5 w-full" />
            <Shimmer className="h-3.5 w-4/5" />
            <Shimmer className="h-3.5 w-3/5" />
          </div>
        ) : (
          <>
            <textarea
              value={systemPrompt}
              onChange={(e) => { setSystemPrompt(e.target.value); setPromptSaved(false) }}
              rows={5}
              placeholder="e.g. You are a helpful customer service assistant for [Business Name]. You help customers with orders, bookings, and general enquiries. Always be polite and professional."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleSavePrompt}
                disabled={isSavingPrompt || !promptChanged}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingPrompt && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isSavingPrompt ? 'Saving…' : 'Save Prompt'}
              </button>
              {promptSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Saved
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Knowledge base */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Knowledge Base</p>
        <p className="text-xs text-gray-500 mb-4">The bot uses your FAQs and catalogue to answer customer questions. The more you add, the more accurately it responds.</p>
        <div className="grid grid-cols-2 gap-3">
          {/* FAQs link */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/30">
                <svg className="h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">FAQs</p>
                <p className="text-xs text-gray-400">
                  {faqCount === null ? '…' : `${faqCount} question${faqCount !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Link href="/faqs" className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-600 ring-1 ring-violet-400/40 hover:bg-violet-500/30">
              Manage
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>

          {/* Catalogue link */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-400/30">
                <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Catalogue</p>
                <p className="text-xs text-gray-400">
                  {catCount === null ? '…' : `${catCount} categor${catCount !== 1 ? 'ies' : 'y'}`}
                </p>
              </div>
            </div>
            <Link href="/catalogue" className="inline-flex items-center gap-1 rounded-lg bg-orange-500/20 px-2.5 py-1 text-xs font-semibold text-orange-600 ring-1 ring-orange-400/40 hover:bg-orange-500/30">
              Manage
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
