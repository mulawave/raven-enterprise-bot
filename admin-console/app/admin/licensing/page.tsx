'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

/* ── Types ─────────────────────────────────────────────────────────────── */

interface License {
  id: string
  key_hash: string
  key_display: string | null
  type: string
  status: string
  buyer_email: string
  buyer_name: string
  max_domains: number
  revoked_at: string | null
  created_at: string
  activations: Activation[]
}

interface Activation {
  id: string
  license_id: string
  domain: string
  ip_address: string | null
  status: string
  activated_at: string | null
  last_verified_at: string | null
  fingerprint: string | null
  created_at: string
  license?: License
}

interface Attempt {
  id: string
  license_key_partial: string | null
  domain: string
  ip_address: string
  email: string | null
  user_agent: string | null
  status: string
  failure_reason: string | null
  created_at: string
}

type Tab = 'keys' | 'activations' | 'attempts'

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
    PENDING: 'bg-amber-500/20 text-amber-400 ring-amber-500/30',
    REVOKED: 'bg-red-500/20 text-red-400 ring-red-500/30',
    SUSPENDED: 'bg-orange-500/20 text-orange-400 ring-orange-500/30',
    SUCCESS: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
    REJECTED: 'bg-red-500/20 text-red-400 ring-red-500/30',
    BLACKLISTED: 'bg-red-700/20 text-red-300 ring-red-700/30',
  }
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[status] || 'bg-slate-500/20 text-slate-400 ring-slate-500/30'}`}>
      {status}
    </span>
  )
}

/* ── Shimmer Rows ──────────────────────────────────────────────────────── */

function ShimmerRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-white/5" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/* ── Generate Key Modal ────────────────────────────────────────────────── */

function GenerateModal({
  open,
  onClose,
  onGenerated,
}: {
  open: boolean
  onClose: () => void
  onGenerated: () => void
}) {
  const [type, setType] = useState<'REGULAR' | 'EXTENDED'>('REGULAR')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [maxDomains, setMaxDomains] = useState(5)
  const [saving, setSaving] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setType('REGULAR')
    setBuyerEmail('')
    setBuyerName('')
    setMaxDomains(5)
    setGeneratedKey(null)
    setCopied(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleGenerate = async () => {
    if (!buyerEmail.trim() || !buyerName.trim()) return
    setSaving(true)
    try {
      const res = await api.post<{ rawKey: string }>('/admin/licensing/keys/generate', {
        type,
        buyer_email: buyerEmail.trim(),
        buyer_name: buyerName.trim(),
        max_domains: type === 'EXTENDED' ? maxDomains : 1,
      })
      setGeneratedKey(res.rawKey)
      onGenerated()
    } catch {
      // handled by api layer
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl">
        {generatedKey ? (
          <>
            <h3 className="text-lg font-bold text-white mb-2">License Key Generated</h3>
            <p className="text-sm text-slate-400 mb-4">
              Copy this key now — it will not be shown again.
            </p>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-mono text-sm text-emerald-300 break-all">
              {generatedKey}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
              >
                {copied ? '✓ Copied!' : 'Copy Key'}
              </button>
              <button
                onClick={handleClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-4">Generate License Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">License Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['REGULAR', 'EXTENDED'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        type === t
                          ? 'border-blue-500/40 bg-blue-500/20 text-blue-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Buyer Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/40"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Buyer Email</label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={e => setBuyerEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/40"
                  placeholder="buyer@example.com"
                />
              </div>
              {type === 'EXTENDED' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Max Domains</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxDomains}
                    onChange={e => setMaxDomains(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/40"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={saving || !buyerEmail.trim() || !buyerName.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/20 px-4 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/30 disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400" />
                    Generating…
                  </>
                ) : (
                  'Generate Key'
                )}
              </button>
              <button
                onClick={handleClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LicensingPage() {
  const [tab, setTab] = useState<Tab>('keys')
  const [keys, setKeys] = useState<License[]>([])
  const [activations, setActivations] = useState<Activation[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadKeys = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<License[]>('/admin/licensing/keys')
      setKeys(data)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [])

  const loadActivations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Activation[]>('/admin/licensing/activations')
      setActivations(data)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [])

  const loadAttempts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<Attempt[]>('/admin/licensing/attempts')
      setAttempts(data)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'keys') loadKeys()
    else if (tab === 'activations') loadActivations()
    else loadAttempts()
  }, [tab, loadKeys, loadActivations, loadAttempts])

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this license key? All activations will also be revoked.')) return
    setActionLoading(id)
    try {
      await api.patch(`/admin/licensing/keys/${id}/revoke`)
      showToast('License revoked')
      loadKeys()
    } catch {
      showToast('Failed to revoke', 'error')
    } finally { setActionLoading(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this license key and all its activations? This cannot be undone.')) return
    setActionLoading(id)
    try {
      await api.delete(`/admin/licensing/keys/${id}`)
      showToast('License deleted')
      loadKeys()
    } catch {
      showToast('Failed to delete', 'error')
    } finally { setActionLoading(null) }
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await api.patch(`/admin/licensing/activations/${id}/approve`)
      showToast('Activation approved')
      loadActivations()
    } catch {
      showToast('Failed to approve', 'error')
    } finally { setActionLoading(null) }
  }

  const handleRevokeActivation = async (id: string) => {
    if (!confirm('Revoke this domain activation?')) return
    setActionLoading(id)
    try {
      await api.patch(`/admin/licensing/activations/${id}/revoke`)
      showToast('Activation revoked')
      loadActivations()
    } catch {
      showToast('Failed to revoke', 'error')
    } finally { setActionLoading(null) }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'keys', label: 'License Keys', count: keys.length },
    { key: 'activations', label: 'Activations', count: activations.length },
    { key: 'attempts', label: 'Attempts', count: attempts.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Licensing</h1>
          <p className="mt-1 text-sm text-slate-400">Manage license keys, domain activations, and activation attempts.</p>
        </div>
        <button
          onClick={() => setGenerateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/20 px-5 py-2.5 text-sm font-semibold text-blue-300 transition hover:-translate-y-0.5 hover:bg-blue-500/30"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Generate Key
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-700/50 bg-slate-800/50 p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Keys Tab */}
      {tab === 'keys' && (
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">License Key</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Domains</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <ShimmerRows cols={7} />
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No license keys generated yet.
                    </td>
                  </tr>
                ) : (
                  keys.map(k => (
                    <tr key={k.id} className="group hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                          k.type === 'EXTENDED'
                            ? 'bg-blue-500/20 text-blue-300 ring-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 ring-amber-500/30'
                        }`}>
                          {k.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{k.buyer_name}</p>
                        <p className="text-xs text-slate-500">{k.buyer_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {k.key_display ? (
                          <code className="rounded bg-slate-800 px-2 py-1 text-xs font-mono text-slate-300 select-all">{k.key_display}</code>
                        ) : (
                          <span className="text-xs text-slate-600 italic">hidden</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(k.status)}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {k.activations.filter(a => a.status === 'ACTIVE').length} / {k.max_domains}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmt(k.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                          {k.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleRevoke(k.id)}
                              disabled={actionLoading === k.id}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {actionLoading === k.id ? (
                                <div className="h-3 w-3 animate-spin rounded-full border border-red-400/30 border-t-red-400" />
                              ) : (
                                'Revoke'
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(k.id)}
                            disabled={actionLoading === k.id}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                            title="Delete license"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Activations Tab */}
      {tab === 'activations' && (
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Activated</th>
                  <th className="px-4 py-3">Last Verified</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <ShimmerRows cols={7} />
                ) : activations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No activations found.
                    </td>
                  </tr>
                ) : (
                  activations.map(a => (
                    <tr key={a.id} className="group hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 text-white font-medium">{a.domain}</td>
                      <td className="px-4 py-3">
                        {a.license ? (
                          <div>
                            <p className="text-slate-300 text-xs">{a.license.buyer_name}</p>
                            <p className="text-slate-500 text-xs">{a.license.type}</p>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(a.status)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{a.ip_address || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmt(a.activated_at)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmt(a.last_verified_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                          {a.status === 'PENDING' && (
                            <button
                              onClick={() => handleApprove(a.id)}
                              disabled={actionLoading === a.id}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              {actionLoading === a.id ? (
                                <div className="h-3 w-3 animate-spin rounded-full border border-emerald-400/30 border-t-emerald-400" />
                              ) : (
                                'Approve'
                              )}
                            </button>
                          )}
                          {a.status !== 'REVOKED' && (
                            <button
                              onClick={() => handleRevokeActivation(a.id)}
                              disabled={actionLoading === a.id}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attempts Tab */}
      {tab === 'attempts' && (
        <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Key (partial)</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <ShimmerRows cols={7} />
                ) : attempts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No activation attempts recorded.
                    </td>
                  </tr>
                ) : (
                  attempts.map(a => (
                    <tr key={a.id} className={`hover:bg-white/[0.02] transition ${a.status === 'BLACKLISTED' ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-3 text-white font-medium">{a.domain}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{a.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">…{a.license_key_partial || '?'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{a.ip_address}</td>
                      <td className="px-4 py-3">{statusBadge(a.status)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{a.failure_reason || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmt(a.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      <GenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onGenerated={() => { if (tab === 'keys') loadKeys() }}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
            : 'border-red-500/20 bg-red-500/10 text-red-400'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
