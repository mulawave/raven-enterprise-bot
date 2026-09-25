'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { useTenantContext } from '@/lib/tenant-context'

interface PlanUpgradeModalProps {
  currentPlan: string
}

interface InitializeResult {
  authorizationUrl: string
  planName: string
  amountKobo: number
  reference: string
}

interface ApiPlan {
  tier: string
  name: string
  description: string | null
  price_kobo: number
  price_formatted: string
  conversations_limit: number
  features: string[]
}

interface PlansResponse {
  currentPlanTier: string
  plans: ApiPlan[]
}

function ShimmerRow({ width = '100%', height = 16 }: { width?: string; height?: number }) {
  return (
    <div
      className="animate-pulse rounded bg-gray-700/50"
      style={{ width, height: `${height}px` }}
    />
  )
}

export default function PlanUpgradeModal({ currentPlan }: PlanUpgradeModalProps) {
  const { tenant } = useTenantContext()
  const isSuspended = tenant.status === 'SUSPENDED'

  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Plans state
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState(false)

  const loadPlans = useCallback(async () => {
    setPlansLoading(true)
    setPlansError(false)
    try {
      const res = await api<PlansResponse>('/api/plans')
      setPlans(res.plans ?? [])
    } catch {
      setPlansError(true)
    } finally {
      setPlansLoading(false)
    }
  }, [])

  function handleOpen() {
    setSelectedPlan(currentPlan)
    setError(null)
    setIsOpen(true)
    if (plans.length === 0) loadPlans()
  }

  async function handleProceedToPayment() {
    if (isSuspended || selectedPlan === currentPlan) return
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await api<InitializeResult>('/api/subscription/payment/initialize', {
        method: 'POST',
        body: JSON.stringify({ newPlanTier: selectedPlan }),
      })
      window.location.href = result.authorizationUrl
    } catch (err) {
      setError((err as Error).message || 'Failed to start payment. Please try again.')
      setIsSubmitting(false)
    }
    // isSubmitting stays true — page navigates away
  }

  const selectedPlanData = plans.find(p => p.tier === selectedPlan)
  const currentPlanIdx = plans.findIndex(p => p.tier === currentPlan)
  const selectedPlanIdx = plans.findIndex(p => p.tier === selectedPlan)
  const isDowngrade = selectedPlanIdx < currentPlanIdx && currentPlanIdx >= 0 && selectedPlanIdx >= 0

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={isSuspended}
        className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-400 transition hover:bg-sky-500/20 hover:border-sky-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
        </svg>
        Change Plan
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Change Subscription Plan</h3>
                <p className="mt-0.5 text-sm text-gray-400">Select a plan and pay securely via Paystack.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="mt-0.5 rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Plan list */}
            <div className="space-y-2 p-6 pb-0">
              {plansLoading ? (
                // Shimmer skeleton rows
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-4 w-4 rounded-full bg-gray-700/60 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <ShimmerRow width="40%" height={14} />
                          <ShimmerRow width="65%" height={12} />
                        </div>
                      </div>
                      <div className="space-y-1.5 text-right">
                        <ShimmerRow width="72px" height={14} />
                        <ShimmerRow width="40px" height={10} />
                      </div>
                    </div>
                  </div>
                ))
              ) : plansError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
                  <p className="text-sm text-red-400 mb-2">Failed to load plans</p>
                  <button
                    onClick={loadPlans}
                    className="text-sm text-red-300 underline hover:text-red-200"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                plans.map((plan) => {
                  const isCurrent = plan.tier === currentPlan
                  const isSelected = plan.tier === selectedPlan
                  return (
                    <label
                      key={plan.tier}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-sky-500/60 bg-sky-500/10 ring-1 ring-sky-500/40'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.tier}
                        checked={isSelected}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="hidden"
                      />
                      {/* Radio indicator */}
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected ? 'border-sky-400 bg-sky-400' : 'border-gray-600'
                      }`}>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-gray-900" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-200'}`}>{plan.name}</span>
                          {isCurrent && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">Current</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400 truncate">
                          {plan.conversations_limit === -1 ? 'Unlimited' : plan.conversations_limit.toLocaleString()} conversations/month
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-bold ${isSelected ? 'text-sky-400' : 'text-gray-200'}`}>{plan.price_formatted}</p>
                        <p className="text-xs text-gray-500">/month</p>
                      </div>
                    </label>
                  )
                })
              )}
            </div>

            {/* Upgrade/downgrade notice */}
            {!plansLoading && !plansError && selectedPlan !== currentPlan && selectedPlanData && (
              <div className={`mx-6 mt-3 rounded-lg border px-3 py-2 text-xs ${
                isDowngrade
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
              }`}>
                {isDowngrade
                  ? `Downgrading to ${selectedPlanData.name} — the lower limit applies from the next billing period.`
                  : `Upgrading to ${selectedPlanData.name} (${selectedPlanData.price_formatted}/month) — you'll be redirected to Paystack.`
                }
              </div>
            )}

            {error && (
              <div className="mx-6 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-3 p-6 pt-4">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToPayment}
                disabled={isSubmitting || selectedPlan === currentPlan || plansLoading || plansError}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Redirecting to Paystack…
                  </>
                ) : 'Pay & Upgrade'}
              </button>
            </div>
            <p className="pb-4 text-center text-xs text-gray-600">Payments processed securely by Paystack</p>
          </div>
        </div>
      )}
    </>
  )
}
