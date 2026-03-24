'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import Button from '@/components/Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BroadcastForm {
  title: string
  body: string
  type: string
  segment: 'all' | 'plan:starter' | 'plan:growth' | 'plan:enterprise' | 'custom'
  tenantIds: string
  sendPush: boolean
  sendEmail: boolean
  emailSubject: string
  emailHtml: string
}

interface BroadcastHistory {
  title: string
  body: string
  type: string
  sent_at: string
  recipient_count: string
}

interface BroadcastResult {
  ok: boolean
  tenants: number
  pushTokens: number
  emailsSent: number
}

const SEGMENT_LABELS: Record<string, string> = {
  all: 'All Active Tenants',
  'plan:starter': 'Starter Plan Tenants',
  'plan:growth': 'Growth Plan Tenants',
  'plan:enterprise': 'Enterprise Plan Tenants',
  custom: 'Specific Tenant IDs',
}

const NOTIF_TYPES = ['broadcast', 'alert', 'new_tenant', 'payment', 'order_new', 'order_status', 'escalation']

const TYPE_ICONS: Record<string, string> = {
  broadcast: '📢',
  alert: '⚠️',
  new_tenant: '🎉',
  payment: '💳',
  order_new: '🛒',
  order_status: '📦',
  escalation: '🔴',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [form, setForm] = useState<BroadcastForm>({
    title: '',
    body: '',
    type: 'broadcast',
    segment: 'all',
    tenantIds: '',
    sendPush: true,
    sendEmail: false,
    emailSubject: '',
    emailHtml: '',
  })
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [history, setHistory] = useState<BroadcastHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose')

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const data = await api.get<{ items: BroadcastHistory[] }>('/admin/notifications/broadcasts')
      setHistory(data?.items ?? [])
    } catch {
      // non-critical
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleChange = <K extends keyof BroadcastForm>(key: K, value: BroadcastForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setResult(null)
    setError(null)
  }

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and message body are required.')
      return
    }
    if (form.sendEmail && (!form.emailSubject.trim() || !form.emailHtml.trim())) {
      setError('Email subject and HTML are required when Send Email is enabled.')
      return
    }

    setIsSending(true)
    setError(null)
    setResult(null)

    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        segment: form.segment === 'custom' ? 'all' : form.segment,
        sendEmail: form.sendEmail,
      }

      if (form.segment === 'custom' && form.tenantIds.trim()) {
        payload.tenantIds = form.tenantIds.split(',').map((s) => s.trim()).filter(Boolean)
        payload.segment = 'custom'
      }

      if (form.sendEmail) {
        payload.emailSubject = form.emailSubject.trim()
        payload.emailHtml = form.emailHtml.trim()
      }

      const res = await api.post<BroadcastResult>('/admin/notifications/broadcast', payload)
      setResult(res)
      fetchHistory()
    } catch (err: any) {
      setError(err?.message ?? 'Broadcast failed. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">
            Send push notifications and email newsletters to your tenant users.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {(['compose', 'history'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'compose' ? '✏️ Compose' : '📜 Broadcast History'}
          </button>
        ))}
      </div>

      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* ── Form ───────────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-5">Compose Message</h2>

              {/* Segment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(SEGMENT_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleChange('segment', val as BroadcastForm['segment'])}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-all ${
                        form.segment === val
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {form.segment === 'custom' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tenant IDs (comma-separated)
                    </label>
                    <textarea
                      rows={2}
                      value={form.tenantIds}
                      onChange={(e) => handleChange('tenantIds', e.target.value)}
                      placeholder="uuid1, uuid2, uuid3"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Notification type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notification Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {NOTIF_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleChange('type', t)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        form.type === t
                          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {TYPE_ICONS[t]} {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g. Platform Maintenance Tonight"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Body */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={form.body}
                  onChange={(e) => handleChange('body', e.target.value)}
                  placeholder="Write your notification message here…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Delivery options */}
              <div className="mb-5 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.sendPush}
                    onChange={(e) => handleChange('sendPush', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">Push Notification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.sendEmail}
                    onChange={(e) => handleChange('sendEmail', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">Email Newsletter</span>
                </label>
              </div>

              {/* Email fields (conditional) */}
              {form.sendEmail && (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.emailSubject}
                      onChange={(e) => handleChange('emailSubject', e.target.value)}
                      placeholder="e.g. Important Update from Raven"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email HTML Body <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={6}
                      value={form.emailHtml}
                      onChange={(e) => handleChange('emailHtml', e.target.value)}
                      placeholder="<div style='...'>Your email HTML here</div>"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Success */}
              {result && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-800">Broadcast sent successfully!</p>
                  <ul className="mt-1 text-xs text-emerald-700 space-y-0.5">
                    <li>• {result.tenants} tenant(s) targeted</li>
                    <li>• {result.pushTokens} push notification(s) dispatched</li>
                    {result.emailsSent > 0 && <li>• {result.emailsSent} email(s) sent</li>}
                  </ul>
                </div>
              )}

              <Button
                isLoading={isSending}
                loadingText="Sending…"
                onClick={handleSend}
                className="w-full justify-center"
              >
                🚀 Send Broadcast
              </Button>
            </div>
          </div>

          {/* ── Preview ────────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sticky top-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Preview</h2>

              {/* Mobile push preview */}
              <div className="rounded-2xl border border-slate-300 bg-slate-800 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🦅</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-white">Raven</p>
                      <p className="text-xs text-slate-400">now</p>
                    </div>
                    <p className="text-sm font-medium text-white leading-snug">
                      {form.title || <span className="text-slate-500 italic">Notification title</span>}
                    </p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {form.body || <span className="italic">Message body will appear here…</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Segment summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Target Summary</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Audience</span>
                    <span className="text-xs font-medium text-slate-700">{SEGMENT_LABELS[form.segment]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Type</span>
                    <span className="text-xs font-medium text-slate-700">{TYPE_ICONS[form.type]} {form.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Channels</span>
                    <span className="text-xs font-medium text-slate-700">
                      {[form.sendPush && 'Push', form.sendEmail && 'Email'].filter(Boolean).join(' + ') || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── History tab ───────────────────────────────────────────────── */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Broadcast History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Body</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipients</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoadingHistory ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : history.length ? (
                  history.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 max-w-[180px] truncate">{h.title}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-[240px] truncate">{h.body}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {TYPE_ICONS[h.type] ?? '🔔'} {h.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700">{h.recipient_count}</td>
                      <td className="px-6 py-4 text-right text-slate-500 text-xs whitespace-nowrap">
                        {new Date(h.sent_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                      No broadcasts sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
