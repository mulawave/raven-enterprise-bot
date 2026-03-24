"use client"

import { useState, useEffect, useCallback } from 'react'
import BrandingForm from '@/components/BrandingForm'
import { useTenantContext } from '@/lib/tenant-context'
import { api } from '@/lib/api'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface BrandingSettings {
  businessName: string
  logoUrl?: string
  primaryColor?: string
  whatsappNumber?: string
}

interface DeletionRequest {
  id: string
  confirmation_code: string
  identifier: string
  identifier_type: string
  status: string
  source: string
  requested_at: string
  completed_at: string | null
  notes: string | null
}

interface MenuCategory {
  id: string
  name: string
  created_at: string
}

interface MenuItem {
  id: string
  category_id: string
  name: string
  price_kobo: number
  available: boolean
  created_at: string
}

interface Faq {
  id: string
  question: string
  answer: string
  sort_order: number
}

// â”€â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Toast({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
      msg.type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      {msg.text}
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const show = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }, [])
  return { toast, show }
}

// â”€â”€â”€ Tab: Data & Privacy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DataDeletionSection() {
  const { tenant } = useTenantContext()
  const [requests, setRequests] = useState<DeletionRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newIdentifier, setNewIdentifier] = useState('')
  const [newIdentifierType, setNewIdentifierType] = useState<'phone' | 'email'>('phone')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { toast, show: showToast } = useToast()

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/data-deletion?t=${tenant.id}`
    : `/data-deletion?t=${tenant.id}`

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api<DeletionRequest[]>('/api/data-deletion')
      setRequests(data)
    } catch {
      showToast('error', 'Failed to load deletion requests.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api('/api/data-deletion', {
        method: 'POST',
        body: JSON.stringify({ identifier: newIdentifier.trim(), identifierType: newIdentifierType }),
      })
      setNewIdentifier('')
      showToast('success', 'Deletion request created.')
      await load()
    } catch {
      showToast('error', 'Failed to create request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleProcess(id: string) {
    setProcessingId(id)
    try {
      await api(`/api/data-deletion/${id}/process`, { method: 'POST' })
      showToast('success', 'Data erased successfully.')
      await load()
    } catch {
      showToast('error', 'Failed to process request. Please try again.')
    } finally {
      setProcessingId(null)
    }
  }

  const shimmerRow = (key: number) => (
    <tr key={key} className="border-t border-gray-100">
      {[1, 2, 3, 4, 5].map((c) => (
        <td key={c} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 animate-pulse" />
        </td>
      ))}
    </tr>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Data & Privacy</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage data deletion requests from your customers. You are required to erase a customer's data
          upon request to comply with GDPR, NDPR, and Meta platform policy.
        </p>
      </div>

      {/* Customer portal link */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
        <p className="text-sm font-medium text-indigo-800 mb-1">Customer self-service deletion page</p>
        <p className="text-xs text-indigo-600 mb-2">
          Share this link with customers so they can submit their own deletion requests directly.
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={portalUrl}
            className="flex-1 rounded border border-indigo-200 bg-white px-3 py-1.5 text-xs text-gray-700 font-mono focus:outline-none"
          />
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(portalUrl); showToast('success', 'Link copied!') }}
            className="rounded border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Manual request form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Identifier type</label>
          <select
            value={newIdentifierType}
            onChange={(e) => setNewIdentifierType(e.target.value as 'phone' | 'email')}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="phone">Phone</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {newIdentifierType === 'phone' ? 'Phone number' : 'Email address'}
          </label>
          <input
            type={newIdentifierType === 'email' ? 'email' : 'tel'}
            required
            value={newIdentifier}
            onChange={(e) => setNewIdentifier(e.target.value)}
            placeholder={newIdentifierType === 'phone' ? '+2348012345678' : 'customer@example.com'}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !newIdentifier.trim()}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating…
            </span>
          ) : 'Create request'}
        </button>
      </form>

      <Toast msg={toast} />

      {/* Requests table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Identifier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Requested</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => shimmerRow(i))
              : requests.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    No deletion requests yet
                  </td>
                </tr>
              )
              : requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.identifier}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.identifier_type}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.source.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(r.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleProcess(r.id)}
                        disabled={processingId === r.id}
                        className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      >
                        {processingId === r.id ? (
                          <span className="flex items-center gap-1">
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-700" />
                            Erasing…
                          </span>
                        ) : 'Erase data'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// â”€â”€â”€ Tab: WhatsApp & AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type KeyField = 'META_APP_SECRET' | 'META_WEBHOOK_VERIFY_TOKEN' | 'META_ACCESS_TOKEN' | 'META_PHONE_NUMBER_ID' | 'OPENAI_API_KEY'

const KEY_META: Array<{ key: KeyField; label: string; hint: string }> = [
  { key: 'META_APP_SECRET',           label: 'Meta App Secret',       hint: 'From Meta for Developers \u2192 Your App \u2192 Settings \u2192 Basic \u2192 App Secret' },
  { key: 'META_WEBHOOK_VERIFY_TOKEN', label: 'Webhook Verify Token',  hint: 'Any string you choose \u2014 must match what you enter in Meta Webhooks configuration' },
  { key: 'META_ACCESS_TOKEN',         label: 'Meta Access Token',     hint: 'WhatsApp Business API permanent access token (WhatsApp \u2192 API Setup)' },
  { key: 'META_PHONE_NUMBER_ID',      label: 'Phone Number ID',       hint: 'From WhatsApp \u2192 API Setup \u2192 Phone Number ID (numeric, not the display number)' },
  { key: 'OPENAI_API_KEY',            label: 'OpenAI API Key',        hint: 'From platform.openai.com \u2192 API Keys. Required for AI-powered replies.' },
]

function WhatsAppAISection() {
  const { toast, show: showToast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [revealed, setRevealed] = useState<Record<KeyField, boolean>>({
    META_APP_SECRET: false,
    META_WEBHOOK_VERIFY_TOKEN: false,
    META_ACCESS_TOKEN: false,
    META_PHONE_NUMBER_ID: false,
    OPENAI_API_KEY: false,
  })
  // form holds displayed values: real value when saved, '' when not set, or new text being typed
  const [form, setForm] = useState<Record<KeyField, string>>({
    META_APP_SECRET: '',
    META_WEBHOOK_VERIFY_TOKEN: '',
    META_ACCESS_TOKEN: '',
    META_PHONE_NUMBER_ID: '',
    OPENAI_API_KEY: '',
  })
  // server-loaded values; used to detect actual changes and restore on blur
  const [serverValues, setServerValues] = useState<Record<KeyField, string>>({
    META_APP_SECRET: '',
    META_WEBHOOK_VERIFY_TOKEN: '',
    META_ACCESS_TOKEN: '',
    META_PHONE_NUMBER_ID: '',
    OPENAI_API_KEY: '',
  })

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api<Array<{ key: string; has_value: boolean; value: string }>>('/api/settings/keys')
      const values = {} as Record<KeyField, string>
      for (const item of data) values[item.key as KeyField] = item.value // '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' or ''
      setForm(values)
      setServerValues(values)
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const keys = Object.entries(form)
        .filter(([k, v]) => v.trim() && v !== serverValues[k as KeyField])
        .map(([key, value]) => ({ key, value }))

      if (keys.length === 0) {
        showToast('error', 'No changes to save \u2014 click a field and type a new value to update it.')
        return
      }

      await api('/api/settings/keys', {
        method: 'POST',
        body: JSON.stringify({ keys }),
      })
      showToast('success', 'Keys saved successfully.')
      await load() // reload to refresh fields with current saved values
    } catch {
      showToast('error', 'Failed to save keys. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">WhatsApp & AI Configuration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your saved keys are shown below. Click any field to replace it with a new value. Leave a field unchanged to keep the current one.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {KEY_META.map(({ key, label, hint }) => {
          const isConfigured = serverValues[key] !== ''
          const isDirty = form[key].trim() !== '' && form[key] !== serverValues[key]
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                {isLoading ? (
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                ) : isConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {isDirty ? 'Will be updated' : 'Configured'}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-600">Not set</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={revealed[key] ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={form[key]}
                  onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Click to enter value\u2026"
                  className={`w-full rounded-lg border pr-10 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                    isDirty
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                />
                <button
                  type="button"
                  aria-label={revealed[key] ? 'Hide value' : 'Reveal value'}
                  onClick={() => setRevealed(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {revealed[key] ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">{hint}</p>
            </div>
          )
        })}

        <Toast msg={toast} />

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">Fields highlighted in blue have unsaved changes.</p>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Saving\u2026
              </span>
            ) : 'Save keys'}
          </button>
        </div>
      </form>
    </div>
  )
}

// â”€â”€â”€ Tab: Menu / Catalogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MenuSection() {
  const { toast, show: showToast } = useToast()
  const { tenant } = useTenantContext()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Category form
  const [catName, setCatName] = useState('')
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null)
  const [savingCat, setSavingCat] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  // Item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [itemForm, setItemForm] = useState({ category_id: '', name: '', price: '', available: true })
  const [savingItem, setSavingItem] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [cats, its] = await Promise.all([
        api<MenuCategory[]>(`/api/ordering/menu/categories?tenantId=${tenant?.id ?? ''}`),
        api<MenuItem[]>(`/api/ordering/menu/items?tenantId=${tenant?.id ?? ''}`),
      ])
      setCategories(cats)
      setItems(its)
    } catch {
      showToast('error', 'Failed to load menu data.')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!catName.trim()) return
    setSavingCat(true)
    try {
      if (editingCat) {
        await api(`/api/ordering/menu/categories/${editingCat.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: catName }),
        })
        showToast('success', 'Category updated.')
      } else {
        await api('/api/ordering/menu/categories', {
          method: 'POST',
          body: JSON.stringify({ name: catName }),
        })
        showToast('success', 'Category created.')
      }
      setCatName('')
      setEditingCat(null)
      await load()
    } catch {
      showToast('error', 'Failed to save category.')
    } finally {
      setSavingCat(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    setDeletingCatId(id)
    try {
      await api(`/api/ordering/menu/categories/${id}`, { method: 'DELETE' })
      showToast('success', 'Category deleted.')
      await load()
    } catch {
      showToast('error', 'Failed to delete category. Remove all items first.')
    } finally {
      setDeletingCatId(null)
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    const priceKobo = Math.round(parseFloat(itemForm.price) * 100)
    if (isNaN(priceKobo) || priceKobo < 0) { showToast('error', 'Enter a valid price.'); return }
    setSavingItem(true)
    try {
      if (editingItem) {
        await api(`/api/ordering/menu/items/${editingItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: itemForm.name, price_kobo: priceKobo, available: itemForm.available, category_id: itemForm.category_id }),
        })
        showToast('success', 'Item updated.')
      } else {
        await api('/api/ordering/menu/items', {
          method: 'POST',
          body: JSON.stringify({ category_id: itemForm.category_id, name: itemForm.name, price_kobo: priceKobo, available: itemForm.available }),
        })
        showToast('success', 'Item added.')
      }
      setItemForm({ category_id: '', name: '', price: '', available: true })
      setEditingItem(null)
      setShowItemForm(false)
      await load()
    } catch {
      showToast('error', 'Failed to save item.')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleDeleteItem(id: string) {
    setDeletingItemId(id)
    try {
      await api(`/api/ordering/menu/items/${id}`, { method: 'DELETE' })
      showToast('success', 'Item deleted.')
      await load()
    } catch {
      showToast('error', 'Failed to delete item.')
    } finally {
      setDeletingItemId(null)
    }
  }

  function startEditItem(item: MenuItem) {
    setEditingItem(item)
    setItemForm({
      category_id: item.category_id,
      name: item.name,
      price: (item.price_kobo / 100).toFixed(2),
      available: item.available,
    })
    setShowItemForm(true)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Menu / Catalogue</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your product categories and items. Customers can view and order from this menu via WhatsApp.
        </p>
      </div>

      <Toast msg={toast} />

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Categories</h3>
        <form onSubmit={handleSaveCategory} className="flex gap-2">
          <input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder={editingCat ? `Rename "${editingCat.name}"…` : 'New category name…'}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={savingCat || !catName.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {savingCat ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {editingCat ? 'Saving…' : 'Adding…'}
              </span>
            ) : editingCat ? 'Save' : 'Add'}
          </button>
          {editingCat && (
            <button
              type="button"
              onClick={() => { setEditingCat(null); setCatName('') }}
              className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </form>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-gray-200 animate-pulse" />
          ))
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No categories yet. Add one above.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingCat(cat); setCatName(cat.name) }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    disabled={deletingCatId === cat.id}
                    className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    {deletingCatId === cat.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Items</h3>
          <button
            onClick={() => { setShowItemForm(!showItemForm); setEditingItem(null); setItemForm({ category_id: categories[0]?.id ?? '', name: '', price: '', available: true }) }}
            className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            {showItemForm && !editingItem ? 'Cancel' : '+ Add item'}
          </button>
        </div>

        {showItemForm && (
          <form onSubmit={handleSaveItem} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700">{editingItem ? 'Edit item' : 'New item'}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={itemForm.category_id}
                  onChange={(e) => setItemForm(p => ({ ...p, category_id: e.target.value }))}
                  required
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input
                  value={itemForm.name}
                  onChange={(e) => setItemForm(p => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="e.g. Jollof Rice"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (₦)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm(p => ({ ...p, price: e.target.value }))}
                  required
                  placeholder="e.g. 2500"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.available}
                    onChange={(e) => setItemForm(p => ({ ...p, available: e.target.checked }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Available for order</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={savingItem}
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {savingItem ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving…
                  </span>
                ) : editingItem ? 'Update item' : 'Add item'}
              </button>
              <button
                type="button"
                onClick={() => { setShowItemForm(false); setEditingItem(null) }}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-200 animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No items yet. Add your first item above.</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
            {items.map((item) => {
              const cat = categories.find((c) => c.id === item.category_id)
              return (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">{cat?.name ?? '—'} · ₦{(item.price_kobo / 100).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                    <button onClick={() => startEditItem(item)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={deletingItemId === item.id}
                      className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                    >
                      {deletingItemId === item.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Tab: FAQs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FaqSection() {
  const { toast, show: showToast } = useToast()
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null)
  const [form, setForm] = useState({ question: '', answer: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api<Faq[]>('/api/faqs')
      setFaqs(data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.question.trim() || !form.answer.trim()) return
    setIsSaving(true)
    try {
      if (editingFaq) {
        await api(`/api/faqs/${editingFaq.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        })
        showToast('success', 'FAQ updated.')
      } else {
        await api('/api/faqs', {
          method: 'POST',
          body: JSON.stringify({ ...form, sort_order: faqs.length }),
        })
        showToast('success', 'FAQ added.')
      }
      setForm({ question: '', answer: '' })
      setEditingFaq(null)
      setShowForm(false)
      await load()
    } catch (err: any) {
      showToast('error', err?.message ?? 'Failed to save FAQ.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api(`/api/faqs/${id}`, { method: 'DELETE' })
      showToast('success', 'FAQ deleted.')
      await load()
    } catch (err: any) {
      showToast('error', err?.message ?? 'Failed to delete FAQ.')
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(faq: Faq) {
    setEditingFaq(faq)
    setForm({ question: faq.question, answer: faq.answer })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">FAQs</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add frequently asked questions. The AI uses these to give accurate answers to your customers.
        </p>
      </div>

      <Toast msg={toast} />

      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); setEditingFaq(null); setForm({ question: '', answer: '' }) }}
          className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          {showForm && !editingFaq ? 'Cancel' : '+ Add FAQ'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700">{editingFaq ? 'Edit FAQ' : 'New FAQ'}</h4>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
            <input
              value={form.question}
              onChange={(e) => setForm(p => ({ ...p, question: e.target.value }))}
              required
              placeholder="e.g. What are your opening hours?"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Answer</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm(p => ({ ...p, answer: e.target.value }))}
              required
              rows={3}
              placeholder="e.g. We are open Monday to Saturday, 8amâ€“8pm."
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Saving…
                </span>
              ) : editingFaq ? 'Update' : 'Add FAQ'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingFaq(null) }}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-gray-200 animate-pulse" />
        ))
      ) : faqs.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No FAQs yet. Add your first one above.</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {faqs.map((faq) => (
            <div key={faq.id} className="px-4 py-4 bg-white hover:bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{faq.question}</p>
                  <p className="mt-1 text-sm text-gray-500">{faq.answer}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(faq)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    disabled={deletingId === faq.id}
                    className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    {deletingId === faq.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TABS = [
  { id: 'branding', label: 'Branding' },
  { id: 'whatsapp', label: 'WhatsApp & AI' },
  { id: 'menu', label: 'Menu / Catalogue' },
  { id: 'faqs', label: 'FAQs' },
  { id: 'debug', label: 'Debug & Setup' },
  { id: 'privacy', label: 'Data & Privacy' },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Tab: Debug & Setup ──────────────────────────────────────────────────────

interface DebugInfo {
  conversations: number
  openConversations: number
  messages: number
  lastMessageAt: string | null
  lastMessageBy: string | null
  lastMessagePreview: string | null
  webhookUrl: string
  webhookVerifyUrl: string
}

function DebugSection() {
  const { toast, show: showToast } = useToast()
  const [info, setInfo] = useState<DebugInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [keys, setKeys] = useState<Array<{ key: string; has_value: boolean }>>([])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [debugData, keysData] = await Promise.all([
        api<DebugInfo>('/api/messaging/debug'),
        api<Array<{ key: string; has_value: boolean }>>('/api/settings/keys'),
      ])
      setInfo(debugData)
      setKeys(keysData)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => showToast('success', `${label} copied!`))
  }

  const webhookUrl = info?.webhookUrl ?? 'https://api.raven-ai.online/api/messaging/webhook/whatsapp'
  const verifyUrl = info?.webhookVerifyUrl ?? 'https://api.raven-ai.online/api/messaging/webhook/verify'

  const KEY_LABELS: Record<string, string> = {
    META_APP_SECRET: 'Meta App Secret',
    META_WEBHOOK_VERIFY_TOKEN: 'Webhook Verify Token',
    META_ACCESS_TOKEN: 'Meta Access Token',
    META_PHONE_NUMBER_ID: 'Phone Number ID',
    OPENAI_API_KEY: 'OpenAI API Key',
  }

  const allKeysSet = keys.length > 0 && keys.every((k) => k.has_value)
  const criticalKeys = ['META_APP_SECRET', 'META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID', 'META_WEBHOOK_VERIFY_TOKEN']
  const criticalConfigured = criticalKeys.every((k) => keys.find((x) => x.key === k)?.has_value)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Debug & Setup Guide</h2>
        <p className="mt-1 text-sm text-gray-500">
          Follow these steps to connect Meta WhatsApp to your bot and diagnose issues.
        </p>
      </div>

      <Toast msg={toast} />

      {/* Live stats */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Live Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Conversations', value: info?.conversations ?? '—' },
            { label: 'Open Conversations', value: info?.openConversations ?? '—' },
            { label: 'Total Messages', value: info?.messages ?? '—' },
            {
              label: 'Last Message',
              value: info?.lastMessageAt
                ? new Date(info.lastMessageAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'None yet',
            },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              {isLoading ? (
                <div className="h-5 w-12 rounded bg-gray-200 animate-pulse mb-1" />
              ) : (
                <p className="text-xl font-bold text-gray-900">{value}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
        {info?.lastMessagePreview && (
          <p className="mt-2 text-xs text-gray-400 italic truncate">
            Last message: &ldquo;{info.lastMessagePreview}&rdquo; — by {info.lastMessageBy}
          </p>
        )}
      </div>

      {/* Key configuration status */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Configuration Status</h3>
        <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
              </div>
            ))
          ) : (
            keys.map(({ key, has_value }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3 bg-white">
                <span className="text-sm text-gray-700">{KEY_LABELS[key] ?? key}</span>
                {has_value ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v-.008H12v.008zM12 3.75a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z" /></svg>
                    Not set
                  </span>
                )}
              </div>
            ))
          )}
        </div>
        {!isLoading && !criticalConfigured && (
          <p className="mt-2 text-xs text-amber-600 font-medium">
            ⚠ Critical keys missing — go to the <a href="#" onClick={(e) => { e.preventDefault(); (document.querySelector('[data-tab="whatsapp"]') as HTMLButtonElement)?.click() }} className="underline">WhatsApp & AI</a> tab to configure them.
          </p>
        )}
      </div>

      {/* Step-by-step setup guide */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Step-by-Step Setup</h3>
        <ol className="space-y-4">
          {[
            {
              step: 1,
              title: 'Create a Meta App',
              done: criticalConfigured,
              content: (
                <p className="text-sm text-gray-600">
                  Go to <strong>developers.facebook.com</strong> → My Apps → Create App → Business type.
                  Add the <strong>WhatsApp</strong> product to your app.
                </p>
              ),
            },
            {
              step: 2,
              title: 'Get your credentials',
              done: keys.find((k) => k.key === 'META_PHONE_NUMBER_ID')?.has_value,
              content: (
                <div className="space-y-1 text-sm text-gray-600">
                  <p>From your Meta App dashboard, collect:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                    <li><strong>App Secret</strong> — Settings → Basic → App Secret</li>
                    <li><strong>Phone Number ID</strong> — WhatsApp → API Setup → Phone Number ID</li>
                    <li><strong>Access Token</strong> — WhatsApp → API Setup → Temporary Token (or generate a permanent one)</li>
                  </ul>
                  <p className="mt-1">Save these in <strong>Settings → WhatsApp & AI</strong>.</p>
                </div>
              ),
            },
            {
              step: 3,
              title: 'Configure your webhook in Meta',
              done: keys.find((k) => k.key === 'META_WEBHOOK_VERIFY_TOKEN')?.has_value,
              content: (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>In Meta for Developers → WhatsApp → Configuration → Webhook, enter:</p>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Callback URL (use this exact URL)</p>
                    <div className="flex items-center gap-2">
                      <input readOnly value={webhookUrl} className="flex-1 rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-mono text-gray-700 focus:outline-none" />
                      <button onClick={() => copy(webhookUrl, 'Webhook URL')} className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 whitespace-nowrap">Copy</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Verify Token — must match what you saved as <em>Webhook Verify Token</em> in Settings</p>
                    <p className="text-xs text-gray-500">Choose any string (e.g. <code className="bg-gray-100 px-1 rounded">raven-webhook-verify</code>), save it in Settings, and paste the same string here.</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <p className="text-xs font-semibold text-amber-800">⚠ Common mistake</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      The <strong>Callback URL</strong> must end in <code className="bg-amber-100 px-1 rounded">/whatsapp</code>, not <code className="bg-amber-100 px-1 rounded">/verify</code>.
                      The verify URL is only for the one-time handshake, not for messages.
                    </p>
                  </div>
                  <p className="text-xs text-amber-700 font-medium">After saving, click <strong>Verify and save</strong> in Meta — the server will respond immediately.</p>
                </div>
              ),
            },
            {
              step: 4,
              title: 'Subscribe to webhook fields',
              done: (info?.messages ?? 0) > 0,
              content: (
                <p className="text-sm text-gray-600">
                  After the webhook is verified, click <strong>Manage</strong> next to your webhook and
                  check the <strong>messages</strong> field. Without this, Meta will not forward messages to your bot.
                </p>
              ),
            },
            {
              step: 5,
              title: 'Set up OpenAI for AI replies (optional)',
              done: keys.find((k) => k.key === 'OPENAI_API_KEY')?.has_value,
              content: (
                <p className="text-sm text-gray-600">
                  Get an API key from <strong>platform.openai.com</strong> → API Keys and save it in Settings → WhatsApp & AI.
                  Without this, the bot uses rule-based replies only.
                </p>
              ),
            },
            {
              step: 6,
              title: 'Send a test message',
              done: (info?.messages ?? 0) > 0,
              content: (
                <p className="text-sm text-gray-600">
                  WhatsApp the number linked to your Meta app. The message should appear almost instantly
                  in <strong>Conversations</strong>. If it doesn&apos;t appear within 30 seconds, check the stats above — if &ldquo;Total Messages&rdquo; is still 0, your webhook may not be receiving events.
                </p>
              ),
            },
          ].map(({ step, title, done, content }) => (
            <li key={step} className="flex gap-4">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}>
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : step}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold mb-1 ${done ? 'text-emerald-700' : 'text-gray-800'}`}>{title}</p>
                {content}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={load}
          disabled={isLoading}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isLoading && <span className="h-3.5 w-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />}
          Refresh stats
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { branding } = useTenantContext()
  const [activeTab, setActiveTab] = useState<TabId>('branding')

  const initialSettings: BrandingSettings = {
    businessName: branding.businessName || '',
    logoUrl: branding.logoUrl || '',
    primaryColor: branding.primaryColor || '#0ea5e9',
    whatsappNumber: branding.whatsappNumber || '',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'branding' && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding Settings</h2>
            <BrandingForm initialSettings={initialSettings} />
          </>
        )}
        {activeTab === 'whatsapp' && <WhatsAppAISection />}
        {activeTab === 'menu' && <MenuSection />}
        {activeTab === 'faqs' && <FaqSection />}
        {activeTab === 'debug' && <DebugSection />}
        {activeTab === 'privacy' && <DataDeletionSection />}
      </div>
    </div>
  )
}
