"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useTenantContext } from '@/lib/tenant-context'

interface WebsiteAssistantDomain {
  id: string
  hostname: string
  verification_status: string
  verification_token?: string | null
  verified_at?: string | null
}

interface WebsiteAssistant {
  id: string
  tenant_id: string
  name: string
  status: string
  public_embed_key: string
  welcome_message: string | null
  theme_color: string | null
  text_color: string | null
  avatar_url: string | null
  position: string
  show_branding: boolean
  collect_name: boolean
  collect_email: boolean
  collect_phone: boolean
  handoff_enabled: boolean
  domains: WebsiteAssistantDomain[]
  knowledgeSources: unknown[]
  embed_script_url: string
  embed_code: string
}

interface WebsiteAnalyticsSummary {
  totalVisitors: number
  returningVisitors: number
  totalSessions: number
  totalEvents: number
  chatsStarted: number
  leadsCaptured: number
  handoffRequests: number
  topPaths: Array<{ path: string | null; count: number }>
  sessionsByDay: Array<{ day: string; sessions: number }>
}

interface WebsiteAnalyticsVisitor {
  id: string
  visitor_fingerprint: string
  first_seen_at: string
  last_seen_at: string
  visit_count: number
  is_returning: boolean
  country_code: string | null
  country_name: string | null
  region_name: string | null
  city_name: string | null
  first_referrer: string | null
  first_landing_url: string | null
  last_landing_url: string | null
  recent_sessions: Array<{
    id: string
    session_token: string
    started_at: string
    event_count: number
    chat_started: boolean
    lead_captured: boolean
    handoff_requested: boolean
  }>
}

interface WebsiteAnalyticsEvent {
  id: string
  visitor_id: string | null
  session_id: string
  event_type: string
  page_url: string | null
  page_path: string | null
  event_value: string | null
  metadata: unknown | null
  occurred_at: string
}

interface AssistantDraft {
  name: string
  status: string
  welcome_message: string
  theme_color: string
  text_color: string
  show_branding: boolean
  collect_name: boolean
  collect_email: boolean
  collect_phone: boolean
  handoff_enabled: boolean
}

function Toast({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${
      msg.type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-red-200 bg-red-50 text-red-700'
    }`}>
      {msg.text}
    </div>
  )
}

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

function EmptyCard({ onCreate, isCreating }: { onCreate: () => void; isCreating: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 ring-1 ring-indigo-400/20">
        <svg className="h-7 w-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 18.75h9A2.25 2.25 0 0 0 18.75 16.5V7.5A2.25 2.25 0 0 0 16.5 5.25h-9A2.25 2.25 0 0 0 5.25 7.5v9A2.25 2.25 0 0 0 7.5 18.75Zm0 0L3.75 21m3.75-2.25L12 14.25m0 0 4.5 4.5M12 14.25V3" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Launch your website assistant</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
        Create your first assistant, connect a verified domain, and copy the hosted Raven embed snippet into your site header.
      </p>
      <div className="mx-auto mt-6 flex max-w-xl items-center justify-between rounded-2xl border border-white/10 bg-indigo-50 px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/30">
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h15m-15 5.25h15m-15 5.25h9" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">Setup path</p>
            <p className="text-xs text-gray-500">Assistant profile, domain verification, and copy-paste embed code</p>
          </div>
        </div>
        <button
          onClick={onCreate}
          disabled={isCreating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-400/40 hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-700 border-t-transparent" />}
          {isCreating ? 'Creating…' : 'Create assistant'}
          {!isCreating && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

function normalizeDraft(assistant: WebsiteAssistant): AssistantDraft {
  return {
    name: assistant.name ?? '',
    status: assistant.status ?? 'draft',
    welcome_message: assistant.welcome_message ?? '',
    theme_color: assistant.theme_color ?? '#111827',
    text_color: assistant.text_color ?? '#F9FAFB',
    show_branding: assistant.show_branding,
    collect_name: assistant.collect_name,
    collect_email: assistant.collect_email,
    collect_phone: assistant.collect_phone,
    handoff_enabled: assistant.handoff_enabled,
  }
}

function assistantSummaryLabel(assistant: WebsiteAssistant) {
  const verifiedDomains = assistant.domains.filter((domain) => domain.verification_status === 'verified').length
  return `${verifiedDomains} verified domain${verifiedDomains === 1 ? '' : 's'} · ${assistant.status}`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function WidgetPreview({ assistant }: { assistant: WebsiteAssistant }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Widget preview</p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900">How your hosted assistant looks</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
          {assistant.position}
        </span>
      </div>

      <div className="mt-6 rounded-[2rem] border border-gray-200 bg-[#0f172a] p-5 text-white shadow-inner" style={{ background: assistant.theme_color ?? '#0f172a' }}>
        <div className="flex items-center justify-between rounded-3xl bg-white/10 px-4 py-3 text-sm font-semibold text-white">
          <span>{assistant.name}</span>
          <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-white/90">Widget</span>
        </div>

        <div className="mt-4 rounded-3xl bg-white/10 p-4 text-sm leading-6 text-white/95">
          {assistant.welcome_message || 'Hi there! I’m here to help. Ask me anything about your business.'}
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-3xl bg-white/10 px-4 py-3 text-sm text-white/90">How can I update my pricing?</div>
          <div className="rounded-3xl bg-white/10 px-4 py-3 text-sm text-white/90">Can you show me today’s special?</div>
        </div>

        <button className="mt-5 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
          Open chat
        </button>
      </div>
    </section>
  )
}

export default function BotsPage() {
  const { tenant } = useTenantContext()
  const [assistants, setAssistants] = useState<WebsiteAssistant[]>([])
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AssistantDraft | null>(null)
  const [faqCount, setFaqCount] = useState<number | null>(null)
  const [catalogueCount, setCatalogueCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false)
  const [isSavingAssistant, setIsSavingAssistant] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [verificationTokenInput, setVerificationTokenInput] = useState<Record<string, string>>({})
  const [isAddingDomain, setIsAddingDomain] = useState(false)
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [analyticsSummary, setAnalyticsSummary] = useState<WebsiteAnalyticsSummary | null>(null)
  const [analyticsVisitors, setAnalyticsVisitors] = useState<WebsiteAnalyticsVisitor[]>([])
  const [analyticsEvents, setAnalyticsEvents] = useState<WebsiteAnalyticsEvent[]>([])
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  const selectedAssistant = useMemo(
    () => assistants.find((assistant) => assistant.id === selectedAssistantId) ?? null,
    [assistants, selectedAssistantId],
  )

  const hasUnsavedChanges = useMemo(() => {
    if (!selectedAssistant || !draft) return false
    return JSON.stringify(normalizeDraft(selectedAssistant)) !== JSON.stringify(draft)
  }, [draft, selectedAssistant])

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    setIsLoading(true)
    setLoadError(null)
    try {
      const [assistantData, faqData, categoryData] = await Promise.all([
        api<WebsiteAssistant[]>('/api/website-assistant'),
        api<unknown[]>('/api/faqs'),
        tenant?.id ? api<unknown[]>(`/api/ordering/menu/categories?tenantId=${tenant.id}`) : Promise.resolve([]),
      ])

      const nextAssistants = Array.isArray(assistantData) ? assistantData : []
      setAssistants(nextAssistants)
      setFaqCount(Array.isArray(faqData) ? faqData.length : 0)
      setCatalogueCount(Array.isArray(categoryData) ? categoryData.length : 0)

      const nextSelected = nextAssistants.find((assistant) => assistant.id === selectedAssistantId) ?? nextAssistants[0] ?? null
      setSelectedAssistantId(nextSelected?.id ?? null)
      setDraft(nextSelected ? normalizeDraft(nextSelected) : null)
      setVerificationTokenInput(
        nextSelected
          ? Object.fromEntries(nextSelected.domains.map((domain) => [domain.id, domain.verification_token ?? '']))
          : {},
      )
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load website assistant settings.')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAnalytics(assistantId: string) {
    setIsLoadingAnalytics(true)
    setAnalyticsError(null)
    try {
      const [summary, visitors, events] = await Promise.all([
        api<WebsiteAnalyticsSummary>(`/api/website-assistant/${assistantId}/analytics/summary`),
        api<WebsiteAnalyticsVisitor[]>(`/api/website-assistant/${assistantId}/analytics/visitors?limit=5`),
        api<WebsiteAnalyticsEvent[]>(`/api/website-assistant/${assistantId}/analytics/events?limit=10`),
      ])
      setAnalyticsSummary(summary)
      setAnalyticsVisitors(visitors)
      setAnalyticsEvents(events)
    } catch (error) {
      setAnalyticsError(error instanceof Error ? error.message : 'Failed to load assistant analytics.')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (tenant?.id) {
      load()
    }
  }, [tenant?.id])

  useEffect(() => {
    if (selectedAssistant) {
      setDraft(normalizeDraft(selectedAssistant))
      setVerificationTokenInput(Object.fromEntries(selectedAssistant.domains.map((domain) => [domain.id, domain.verification_token ?? ''])))
      setCopiedEmbed(false)
      loadAnalytics(selectedAssistant.id)
    }
  }, [selectedAssistant?.id])

  async function handleCreateAssistant() {
    setIsCreatingAssistant(true)
    try {
      const created = await api<WebsiteAssistant>('/api/website-assistant', { method: 'POST', body: JSON.stringify({}) })
      setAssistants((current) => [created, ...current])
      setSelectedAssistantId(created.id)
      setDraft(normalizeDraft(created))
      setVerificationTokenInput({})
      showToast('success', 'Website assistant created.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to create website assistant.')
    } finally {
      setIsCreatingAssistant(false)
    }
  }

  async function handleSaveAssistant() {
    if (!selectedAssistant || !draft) return
    setIsSavingAssistant(true)
    try {
      const updated = await api<WebsiteAssistant>(`/api/website-assistant/${selectedAssistant.id}`, {
        method: 'PUT',
        body: JSON.stringify(draft),
      })
      setAssistants((current) => current.map((assistant) => assistant.id === updated.id ? updated : assistant))
      setDraft(normalizeDraft(updated))
      showToast('success', 'Assistant settings saved.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save assistant settings.')
    } finally {
      setIsSavingAssistant(false)
    }
  }

  async function handleAddDomain() {
    if (!selectedAssistant || !newDomain.trim()) return
    setIsAddingDomain(true)
    try {
      await api(`/api/website-assistant/${selectedAssistant.id}/domains`, {
        method: 'POST',
        body: JSON.stringify({ hostname: newDomain.trim() }),
      })
      setNewDomain('')
      await load()
      showToast('success', 'Domain added to this assistant.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to add domain.')
    } finally {
      setIsAddingDomain(false)
    }
  }

  async function handleVerifyDomain(domainId: string) {
    if (!selectedAssistant) return
    const token = verificationTokenInput[domainId]?.trim()
    if (!token) {
      showToast('error', 'Enter the domain verification token first.')
      return
    }

    setVerifyingDomainId(domainId)
    try {
      await api(`/api/website-assistant/${selectedAssistant.id}/domains/${domainId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      await load()
      showToast('success', 'Domain verified.')
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to verify domain.')
    } finally {
      setVerifyingDomainId(null)
    }
  }

  async function handleCopyEmbed() {
    if (!selectedAssistant) return
    try {
      await navigator.clipboard.writeText(selectedAssistant.embed_code)
      setCopiedEmbed(true)
      showToast('success', 'Embed code copied.')
      setTimeout(() => setCopiedEmbed(false), 3000)
    } catch {
      showToast('error', 'Failed to copy embed code.')
    }
  }

  return (
    <div className="max-w-6xl">
      <Toast msg={toast} />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Assistant</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Customize your hosted website widget, verify the domains that can load it, and install the generated embed snippet on your public site.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm">
          The widget loads from Raven and only serves requests from verified domains.
        </div>
      </div>

      {loadError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{loadError}</p>
          <button onClick={load} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Shimmer className="h-16 w-full rounded-2xl" />
            <Shimmer className="h-28 w-full rounded-2xl" />
            <Shimmer className="h-28 w-full rounded-2xl" />
          </div>
          <div className="space-y-5">
            <Shimmer className="h-44 w-full rounded-3xl" />
            <Shimmer className="h-60 w-full rounded-3xl" />
            <Shimmer className="h-52 w-full rounded-3xl" />
          </div>
        </div>
      ) : assistants.length === 0 ? (
        <EmptyCard onCreate={handleCreateAssistant} isCreating={isCreatingAssistant} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Assistants</p>
                  <p className="mt-1 text-sm text-gray-600">Select a hosted widget profile to edit.</p>
                </div>
                <button
                  onClick={handleCreateAssistant}
                  disabled={isCreatingAssistant}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-400/40 hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingAssistant && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-700 border-t-transparent" />}
                  {isCreatingAssistant ? 'Creating…' : 'New'}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {assistants.map((assistant) => {
                  const isActive = assistant.id === selectedAssistantId
                  return (
                    <button
                      key={assistant.id}
                      onClick={() => setSelectedAssistantId(assistant.id)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200/70'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{assistant.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{assistantSummaryLabel(assistant)}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          assistant.status === 'live'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {assistant.status}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Knowledge</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/30">
                      <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">FAQs</p>
                      <p className="text-xs text-gray-400">{faqCount === null ? 'Loading…' : `${faqCount} question${faqCount === 1 ? '' : 's'}`}</p>
                    </div>
                  </div>
                  <Link href="/faqs" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-400/40 hover:bg-violet-500/30">
                    Manage
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-400/30">
                      <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Catalogue</p>
                      <p className="text-xs text-gray-400">{catalogueCount === null ? 'Loading…' : `${catalogueCount} categor${catalogueCount === 1 ? 'y' : 'ies'}`}</p>
                    </div>
                  </div>
                  <Link href="/catalogue" className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-400/40 hover:bg-orange-500/30">
                    Manage
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {selectedAssistant && draft && (
              <>
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Profile</p>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900">Assistant setup</h2>
                      <p className="mt-1 text-sm text-gray-500">Define the public widget copy, appearance, capture settings, and launch status.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        draft.status === 'live'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {draft.status === 'live' ? 'Live on verified domains' : 'Draft'}
                      </span>
                      <button
                        onClick={handleSaveAssistant}
                        disabled={isSavingAssistant || !hasUnsavedChanges}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingAssistant && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                        {isSavingAssistant ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">Assistant name</label>
                      <input
                        value={draft.name}
                        onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">Widget status</label>
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">Welcome message</label>
                      <textarea
                        rows={4}
                        value={draft.welcome_message}
                        onChange={(event) => setDraft({ ...draft, welcome_message: event.target.value })}
                        className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">Theme color</label>
                      <div className="flex items-center gap-3 rounded-xl border border-gray-300 px-3 py-2.5">
                        <input
                          type="color"
                          value={draft.theme_color}
                          onChange={(event) => setDraft({ ...draft, theme_color: event.target.value })}
                          className="h-8 w-10 rounded border-0 bg-transparent p-0"
                        />
                        <input
                          value={draft.theme_color}
                          onChange={(event) => setDraft({ ...draft, theme_color: event.target.value })}
                          className="w-full bg-transparent text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">Text color</label>
                      <div className="flex items-center gap-3 rounded-xl border border-gray-300 px-3 py-2.5">
                        <input
                          type="color"
                          value={draft.text_color}
                          onChange={(event) => setDraft({ ...draft, text_color: event.target.value })}
                          className="h-8 w-10 rounded border-0 bg-transparent p-0"
                        />
                        <input
                          value={draft.text_color}
                          onChange={(event) => setDraft({ ...draft, text_color: event.target.value })}
                          className="w-full bg-transparent text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      { key: 'show_branding', title: 'Show Raven branding', copy: 'Keep the default hosted attribution footer visible.' },
                      { key: 'collect_name', title: 'Capture visitor name', copy: 'Ask for a name before deeper conversations.' },
                      { key: 'collect_email', title: 'Capture visitor email', copy: 'Request email for follow-up and lead routing.' },
                      { key: 'collect_phone', title: 'Capture visitor phone', copy: 'Prompt for phone when handoff requires direct contact.' },
                      { key: 'handoff_enabled', title: 'Allow handoff', copy: 'Show the escalation path when a human follow-up is needed.' },
                    ].map((item) => {
                      const checked = draft[item.key as keyof AssistantDraft] as boolean
                      return (
                        <label key={item.key} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => setDraft({ ...draft, [item.key]: event.target.checked })}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                            <p className="mt-1 text-xs leading-5 text-gray-500">{item.copy}</p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Domains</p>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900">Verified origins</h2>
                      <p className="mt-1 text-sm text-gray-500">Only these domains can request widget config, sessions, events, and chat responses.</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                      Add the final production hostname here before installing the embed snippet.
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 md:flex-row">
                    <input
                      value={newDomain}
                      onChange={(event) => setNewDomain(event.target.value)}
                      placeholder="example.com or https://example.com"
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleAddDomain}
                      disabled={isAddingDomain || !newDomain.trim()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAddingDomain && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      {isAddingDomain ? 'Adding…' : 'Add domain'}
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedAssistant.domains.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-gray-500">No domains connected yet</p>
                        <p className="mt-1 text-xs text-gray-400">Add your site hostname first so the widget can be loaded safely.</p>
                      </div>
                    ) : (
                      selectedAssistant.domains.map((domain) => {
                        const isVerified = domain.verification_status === 'verified'
                        return (
                          <div key={domain.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">{domain.hostname}</p>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    isVerified
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {domain.verification_status}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                  {isVerified ? 'This domain can now load the widget publicly.' : 'Use the generated token below to complete verification.'}
                                </p>
                              </div>
                              {!isVerified && (
                                <button
                                  onClick={() => handleVerifyDomain(domain.id)}
                                  disabled={verifyingDomainId === domain.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-400/40 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {verifyingDomainId === domain.id && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />}
                                  {verifyingDomainId === domain.id ? 'Verifying…' : 'Verify token'}
                                </button>
                              )}
                            </div>

                            {!isVerified && (
                              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                <input
                                  value={verificationTokenInput[domain.id] ?? ''}
                                  onChange={(event) => setVerificationTokenInput((current) => ({ ...current, [domain.id]: event.target.value }))}
                                  className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(domain.verification_token ?? '')
                                      showToast('success', 'Domain token copied.')
                                    } catch {
                                      showToast('error', 'Failed to copy domain token.')
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-white"
                                >
                                  Copy token
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Install</p>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900">Embed snippet</h2>
                      <p className="mt-1 text-sm text-gray-500">Paste this script inside your website head or before the closing body tag on a verified domain.</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={selectedAssistant.embed_script_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Open script
                      </a>
                      <button
                        onClick={handleCopyEmbed}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-2 text-xs font-semibold text-sky-700 ring-1 ring-sky-400/40 hover:bg-sky-500/30"
                      >
                        {copiedEmbed ? 'Copied' : 'Copy embed'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-950 px-4 py-4 text-sm text-gray-100">
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono leading-6">{selectedAssistant.embed_code}</pre>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Public embed key</p>
                      <p className="mt-2 break-all font-mono text-sm text-gray-900">{selectedAssistant.public_embed_key}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Hosted script URL</p>
                      <p className="mt-2 break-all text-sm text-gray-900">{selectedAssistant.embed_script_url}</p>
                    </div>
                  </div>
                </section>

                <WidgetPreview assistant={selectedAssistant} />

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Analytics</p>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900">Visitor activity</h2>
                      <p className="mt-1 text-sm text-gray-500">Monitor visitor behavior, event activity, and recent sessions for this assistant.</p>
                    </div>
                    <button
                      onClick={() => selectedAssistant && loadAnalytics(selectedAssistant.id)}
                      disabled={!selectedAssistant || isLoadingAnalytics}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingAnalytics ? 'Refreshing…' : 'Refresh analytics'}
                    </button>
                  </div>

                  {analyticsError && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {analyticsError}
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: 'Visitors', value: analyticsSummary?.totalVisitors ?? 0 },
                      { label: 'Returning', value: analyticsSummary?.returningVisitors ?? 0 },
                      { label: 'Sessions', value: analyticsSummary?.totalSessions ?? 0 },
                      { label: 'Events', value: analyticsSummary?.totalEvents ?? 0 },
                      { label: 'Chats started', value: analyticsSummary?.chatsStarted ?? 0 },
                      { label: 'Handoffs', value: analyticsSummary?.handoffRequests ?? 0 },
                    ].map((card) => (
                      <div key={card.label} className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{card.label}</p>
                        <p className="mt-3 text-3xl font-semibold text-gray-900">
                          {isLoadingAnalytics ? '—' : card.value.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm font-semibold text-gray-900">Recent visitors</p>
                      <p className="mt-1 text-xs text-gray-500">Latest visitors with session history.</p>

                      <div className="mt-4 space-y-3">
                        {isLoadingAnalytics ? (
                          <div className="space-y-2">
                            <div className="h-12 rounded-2xl bg-slate-200" />
                            <div className="h-12 rounded-2xl bg-slate-200" />
                          </div>
                        ) : analyticsVisitors.length === 0 ? (
                          <p className="text-sm text-gray-500">No recent visitors yet.</p>
                        ) : (
                          analyticsVisitors.map((visitor) => (
                            <div key={visitor.id} className="rounded-3xl border border-gray-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{visitor.country_name ?? 'Visitor'}</p>
                                  <p className="mt-1 text-xs text-gray-500">{visitor.visitor_fingerprint.slice(0, 12)}…</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                                  {visitor.is_returning ? 'Returning' : 'New'}
                                </span>
                              </div>
                              <div className="mt-3 text-xs text-gray-500">
                                <p>Last seen: {formatDateTime(visitor.last_seen_at)}</p>
                                <p>Sessions: {visitor.visit_count}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm font-semibold text-gray-900">Recent events</p>
                      <p className="mt-1 text-xs text-gray-500">Track the latest page views, chats, and handoff activity.</p>

                      <div className="mt-4 space-y-3">
                        {isLoadingAnalytics ? (
                          <div className="space-y-2">
                            <div className="h-12 rounded-2xl bg-slate-200" />
                            <div className="h-12 rounded-2xl bg-slate-200" />
                          </div>
                        ) : analyticsEvents.length === 0 ? (
                          <p className="text-sm text-gray-500">No events recorded yet.</p>
                        ) : (
                          analyticsEvents.map((event) => (
                            <div key={event.id} className="rounded-3xl border border-gray-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-semibold text-gray-900">{event.event_type.replace('_', ' ')}</span>
                                <span className="text-gray-500">{formatDateTime(event.occurred_at)}</span>
                              </div>
                              <p className="mt-2 text-xs text-gray-500">{event.page_path ?? event.page_url ?? 'No page data'}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
