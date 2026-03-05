'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import { Button } from '@/components/Button'

interface Plan {
  tier: string
  name: string
  description: string | null
  price_kobo: number
  price_formatted: string
  conversations_limit: number
  overage_price_kobo: number
  overage_price_formatted: string
  features: string[]
  is_active: boolean
  sort_order: number
}

interface EditState {
  name: string
  description: string
  price_naira: string        // display as ₦ naira, convert to kobo on save
  conversations_limit: string
  overage_naira: string      // display as ₦ naira, convert to kobo on save
  features: string[]
  new_feature: string
  is_active: boolean
  sort_order: string
}

const TIER_COLORS: Record<string, string> = {
  starter: 'from-slate-700 to-slate-800 border-slate-600',
  growth: 'from-indigo-700 to-indigo-900 border-indigo-500',
  enterprise: 'from-violet-700 to-violet-900 border-violet-500',
}

const TIER_BADGE: Record<string, string> = {
  starter: 'bg-slate-600 text-slate-100',
  growth: 'bg-indigo-600 text-indigo-100',
  enterprise: 'bg-violet-600 text-violet-100',
}

function planToEdit(plan: Plan): EditState {
  return {
    name: plan.name,
    description: plan.description ?? '',
    price_naira: (plan.price_kobo / 100).toString(),
    conversations_limit: plan.conversations_limit.toString(),
    overage_naira: (plan.overage_price_kobo / 100).toString(),
    features: [...plan.features],
    new_feature: '',
    is_active: plan.is_active,
    sort_order: plan.sort_order.toString(),
  }
}

const BLANK_NEW_PLAN: EditState & { tier: string } = {
  tier: '',
  name: '',
  description: '',
  price_naira: '',
  conversations_limit: '',
  overage_naira: '',
  features: [],
  new_feature: '',
  is_active: true,
  sort_order: '99',
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Per-plan edit drafts (keyed by tier)
  const [editDrafts, setEditDrafts] = useState<Record<string, EditState>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({})

  // Add new plan dialog
  const [showAdd, setShowAdd] = useState(false)
  const [newPlan, setNewPlan] = useState<typeof BLANK_NEW_PLAN>({ ...BLANK_NEW_PLAN })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Confirm deactivate
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null)

  async function fetchPlans() {
    setIsLoading(true)
    setFetchError(null)
    try {
      const res = await api.get<{ plans: Plan[] }>(API_ENDPOINTS.PLANS)
      const loaded = res.plans ?? []
      setPlans(loaded)
      const drafts: Record<string, EditState> = {}
      loaded.forEach((p) => { drafts[p.tier] = planToEdit(p) })
      setEditDrafts(drafts)
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load plans')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchPlans() }, [])

  function setDraftField(tier: string, field: keyof EditState, value: unknown) {
    setEditDrafts((prev) => ({ ...prev, [tier]: { ...prev[tier], [field]: value } }))
  }

  function addFeatureToDraft(tier: string) {
    const draft = editDrafts[tier]
    if (!draft?.new_feature.trim()) return
    setEditDrafts((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        features: [...prev[tier].features, prev[tier].new_feature.trim()],
        new_feature: '',
      },
    }))
  }

  function removeFeatureFromDraft(tier: string, idx: number) {
    setEditDrafts((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        features: prev[tier].features.filter((_, i) => i !== idx),
      },
    }))
  }

  async function savePlan(tier: string) {
    const draft = editDrafts[tier]
    if (!draft) return
    setSaving((s) => ({ ...s, [tier]: true }))
    setSaveErrors((e) => ({ ...e, [tier]: '' }))
    setSaveSuccess((s) => ({ ...s, [tier]: false }))
    try {
      await api.patch(`${API_ENDPOINTS.PLANS}/${tier}`, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        price_kobo: Math.round(parseFloat(draft.price_naira) * 100),
        conversations_limit: parseInt(draft.conversations_limit, 10),
        overage_price_kobo: Math.round(parseFloat(draft.overage_naira) * 100),
        features: draft.features,
        is_active: draft.is_active,
        sort_order: parseInt(draft.sort_order, 10) || 99,
      })
      setSaveSuccess((s) => ({ ...s, [tier]: true }))
      setTimeout(() => setSaveSuccess((s) => ({ ...s, [tier]: false })), 3000)
      await fetchPlans()
    } catch (err: any) {
      setSaveErrors((e) => ({ ...e, [tier]: err.message || 'Save failed' }))
    } finally {
      setSaving((s) => ({ ...s, [tier]: false }))
    }
  }

  async function deactivatePlan(tier: string) {
    setDeleting((d) => ({ ...d, [tier]: true }))
    try {
      await api.delete(`${API_ENDPOINTS.PLANS}/${tier}`)
      setConfirmDeactivate(null)
      await fetchPlans()
    } catch (err: any) {
      setSaveErrors((e) => ({ ...e, [tier]: err.message || 'Deactivate failed' }))
    } finally {
      setDeleting((d) => ({ ...d, [tier]: false }))
    }
  }

  async function createPlan() {
    setIsCreating(true)
    setCreateError(null)
    try {
      await api.post(API_ENDPOINTS.PLANS, {
        tier: newPlan.tier.trim().toLowerCase().replace(/\s+/g, '_'),
        name: newPlan.name.trim(),
        description: newPlan.description.trim() || null,
        price_kobo: Math.round(parseFloat(newPlan.price_naira) * 100),
        conversations_limit: parseInt(newPlan.conversations_limit, 10),
        overage_price_kobo: Math.round(parseFloat(newPlan.overage_naira) * 100),
        features: newPlan.features,
        is_active: true,
        sort_order: parseInt(newPlan.sort_order, 10) || 99,
      })
      setShowAdd(false)
      setNewPlan({ ...BLANK_NEW_PLAN })
      await fetchPlans()
    } catch (err: any) {
      setCreateError(err.message || 'Create failed')
    } finally {
      setIsCreating(false)
    }
  }

  const SHIMMER = 'animate-pulse bg-slate-700 rounded'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
          <p className="text-slate-400 text-sm mt-1">
            Create, edit, and manage pricing tiers for your tenants
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} variant="primary">
          + New Plan
        </Button>
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-300 text-sm">{fetchError}</span>
          <Button size="sm" variant="secondary" onClick={fetchPlans}>Retry</Button>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
                <div className={`${SHIMMER} h-6 w-24`} />
                <div className={`${SHIMMER} h-4 w-40`} />
                <div className={`${SHIMMER} h-10 w-32`} />
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => <div key={j} className={`${SHIMMER} h-4 w-full`} />)}
                </div>
                <div className={`${SHIMMER} h-9 w-full`} />
              </div>
            ))
          : plans.map((plan) => {
              const draft = editDrafts[plan.tier]
              if (!draft) return null
              const isSaving = saving[plan.tier]
              const isDeleting = deleting[plan.tier]
              const error = saveErrors[plan.tier]
              const success = saveSuccess[plan.tier]
              const gradClass = TIER_COLORS[plan.tier] ?? 'from-slate-700 to-slate-800 border-slate-600'
              const badgeClass = TIER_BADGE[plan.tier] ?? 'bg-slate-600 text-slate-100'

              return (
                <div
                  key={plan.tier}
                  className={`bg-gradient-to-br ${gradClass} rounded-xl border p-6 space-y-4`}
                >
                  {/* Plan header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass} mb-2`}>
                        {plan.tier}
                      </span>

                      {/* Name */}
                      <input
                        value={draft.name}
                        onChange={(e) => setDraftField(plan.tier, 'name', e.target.value)}
                        className="block w-full bg-transparent text-white font-bold text-lg border-b border-white/20 focus:border-white/60 outline-none pb-0.5 placeholder-white/40"
                        placeholder="Plan name"
                      />
                      {/* Description */}
                      <input
                        value={draft.description}
                        onChange={(e) => setDraftField(plan.tier, 'description', e.target.value)}
                        className="block w-full bg-transparent text-slate-300 text-sm border-b border-white/10 focus:border-white/40 outline-none mt-1 pb-0.5 placeholder-white/30"
                        placeholder="Short description…"
                      />
                    </div>
                    {/* Active toggle */}
                    <label className="flex flex-col items-center gap-1 cursor-pointer shrink-0">
                      <div
                        onClick={() => setDraftField(plan.tier, 'is_active', !draft.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${draft.is_active ? 'bg-green-500' : 'bg-slate-600'}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${draft.is_active ? 'translate-x-5' : 'translate-x-0.5'}`}
                        />
                      </div>
                      <span className="text-xs text-white/50">{draft.is_active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Price / month (₦)</label>
                      <div className="flex items-center bg-black/20 rounded-lg px-3 py-1.5 border border-white/10 focus-within:border-white/40">
                        <span className="text-white/50 text-sm mr-1">₦</span>
                        <input
                          type="number"
                          value={draft.price_naira}
                          onChange={(e) => setDraftField(plan.tier, 'price_naira', e.target.value)}
                          className="bg-transparent text-white text-sm font-semibold outline-none w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">Overage / conv (₦)</label>
                      <div className="flex items-center bg-black/20 rounded-lg px-3 py-1.5 border border-white/10 focus-within:border-white/40">
                        <span className="text-white/50 text-sm mr-1">₦</span>
                        <input
                          type="number"
                          value={draft.overage_naira}
                          onChange={(e) => setDraftField(plan.tier, 'overage_naira', e.target.value)}
                          className="bg-transparent text-white text-sm font-semibold outline-none w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Conversations limit */}
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Conversations / month limit</label>
                    <input
                      type="number"
                      value={draft.conversations_limit}
                      onChange={(e) => setDraftField(plan.tier, 'conversations_limit', e.target.value)}
                      className="w-full bg-black/20 text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 focus:border-white/40 outline-none"
                      placeholder="500"
                    />
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Features</label>
                    <div className="space-y-1.5">
                      {draft.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-green-400 text-xs">✓</span>
                          <span className="text-sm text-white/80 flex-1">{feat}</span>
                          <button
                            onClick={() => removeFeatureFromDraft(plan.tier, idx)}
                            className="text-white/30 hover:text-red-400 text-xs leading-none transition-colors"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input
                          value={draft.new_feature}
                          onChange={(e) => setDraftField(plan.tier, 'new_feature', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addFeatureToDraft(plan.tier)}
                          className="flex-1 bg-black/20 text-white text-xs rounded-lg px-2 py-1 border border-white/10 focus:border-white/40 outline-none placeholder-white/30"
                          placeholder="Add feature…"
                        />
                        <button
                          onClick={() => addFeatureToDraft(plan.tier)}
                          className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sort order */}
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Display order</label>
                    <input
                      type="number"
                      value={draft.sort_order}
                      onChange={(e) => setDraftField(plan.tier, 'sort_order', e.target.value)}
                      className="w-24 bg-black/20 text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 focus:border-white/40 outline-none"
                    />
                  </div>

                  {/* Feedback */}
                  {error && <p className="text-red-300 text-xs bg-red-900/30 rounded-lg px-3 py-2">{error}</p>}
                  {success && <p className="text-green-300 text-xs bg-green-900/30 rounded-lg px-3 py-2">Plan saved successfully</p>}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isSaving}
                      loadingText="Saving…"
                      onClick={() => savePlan(plan.tier)}
                      className="flex-1"
                    >
                      Save Changes
                    </Button>
                    {plan.is_active && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={isDeleting}
                        loadingText="Deactivating…"
                        onClick={() => setConfirmDeactivate(plan.tier)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
        }

        {/* Empty state */}
        {!isLoading && plans.length === 0 && !fetchError && (
          <div className="col-span-3 bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <p className="text-slate-400">No plans configured.</p>
            <Button variant="primary" className="mt-4" onClick={() => setShowAdd(true)}>
              Create your first plan
            </Button>
          </div>
        )}
      </div>

      {/* Deactivate confirmation modal */}
      {confirmDeactivate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-white font-semibold text-lg mb-2">Deactivate plan?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Plan <span className="text-white font-mono">{confirmDeactivate}</span> will be hidden from new signups.
              Existing subscriptions are unaffected.
            </p>
            <div className="flex gap-3">
              <Button
                variant="danger"
                isLoading={deleting[confirmDeactivate]}
                loadingText="Deactivating…"
                onClick={() => deactivatePlan(confirmDeactivate)}
                className="flex-1"
              >
                Confirm Deactivate
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add new plan modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl my-8">
            <h3 className="text-white font-semibold text-lg mb-4">Create New Plan</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tier ID (unique key)</label>
                  <input
                    value={newPlan.tier}
                    onChange={(e) => setNewPlan((p) => ({ ...p, tier: e.target.value }))}
                    className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none"
                    placeholder="e.g. custom_pro"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name</label>
                  <input
                    value={newPlan.name}
                    onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none"
                    placeholder="e.g. Custom Pro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <input
                  value={newPlan.description}
                  onChange={(e) => setNewPlan((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none"
                  placeholder="Short description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Price / month (₦)</label>
                  <input
                    type="number"
                    value={newPlan.price_naira}
                    onChange={(e) => setNewPlan((p) => ({ ...p, price_naira: e.target.value }))}
                    className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none"
                    placeholder="49000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Overage per conv (₦)</label>
                  <input
                    type="number"
                    value={newPlan.overage_naira}
                    onChange={(e) => setNewPlan((p) => ({ ...p, overage_naira: e.target.value }))}
                    className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none"
                    placeholder="120"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Conversations / month</label>
                <input
                  type="number"
                  value={newPlan.conversations_limit}
                  onChange={(e) => setNewPlan((p) => ({ ...p, conversations_limit: e.target.value }))}
                  className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none"
                  placeholder="500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Features (one per line)</label>
                <textarea
                  rows={4}
                  value={newPlan.features.join('\n')}
                  onChange={(e) => setNewPlan((p) => ({ ...p, features: e.target.value.split('\n').filter(Boolean) }))}
                  className="w-full bg-slate-900 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-indigo-500 outline-none resize-none"
                  placeholder={"White Label Branding\nAI-Powered Messaging\n..."}
                />
              </div>
            </div>

            {createError && (
              <p className="text-red-300 text-xs mt-3 bg-red-900/20 rounded-lg px-3 py-2">{createError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                isLoading={isCreating}
                loadingText="Creating…"
                onClick={createPlan}
                className="flex-1"
              >
                Create Plan
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setShowAdd(false); setNewPlan({ ...BLANK_NEW_PLAN }); setCreateError(null) }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
