'use client'

import { useState } from 'react'
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

// Prices mirror backend PLANS constant in subscriptions.service.ts
const PLANS = [
  { tier: 'starter',    name: 'Starter',    conversations: 500,   priceKobo: 4900000  },
  { tier: 'growth',     name: 'Growth',     conversations: 2500,  priceKobo: 19900000 },
  { tier: 'enterprise', name: 'Enterprise', conversations: 12000, priceKobo: 79900000 },
]

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`
}

export default function PlanUpgradeModal({ currentPlan }: PlanUpgradeModalProps) {
  const { tenant } = useTenantContext()
  const isSuspended = tenant.status === 'SUSPENDED'
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setSelectedPlan(currentPlan)
    setError(null)
    setIsOpen(true)
  }

  async function handleProceedToPayment() {
    if (isSuspended || selectedPlan === currentPlan) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await api<InitializeResult>('/api/subscription/payment/initialize', {
        method: 'POST',
        body: JSON.stringify({ newPlanTier: selectedPlan }),
      })

      // Redirect to Paystack checkout — user completes payment there,
      // then Paystack redirects back to /subscription/payment-callback
      window.location.href = result.authorizationUrl
    } catch (err) {
      setError((err as Error).message || 'Failed to start payment. Please try again.')
      setIsLoading(false)
    }
    // Do NOT reset isLoading — page is navigating away
  }

  const selectedPlanData = PLANS.find(p => p.tier === selectedPlan)
  const isDowngrade = PLANS.findIndex(p => p.tier === selectedPlan) < PLANS.findIndex(p => p.tier === currentPlan)

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={isSuspended}
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Change Plan
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Change Subscription Plan</h3>
            <p className="text-sm text-gray-500 mb-5">Select a plan and complete payment via Paystack to activate.</p>

            <div className="space-y-3 mb-5">
              {PLANS.map((plan) => {
                const isCurrent = plan.tier === currentPlan
                const isSelected = plan.tier === selectedPlan
                return (
                  <label
                    key={plan.tier}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.tier}
                      checked={isSelected}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">{plan.conversations.toLocaleString()} conversations/month</p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="font-semibold text-gray-900">{formatNaira(plan.priceKobo)}</p>
                      <p className="text-xs text-gray-400">/month</p>
                    </div>
                    {isCurrent && (
                      <span className="ml-3 shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Current</span>
                    )}
                  </label>
                )
              })}
            </div>

            {selectedPlan !== currentPlan && selectedPlanData && (
              <div className={`mb-4 px-3 py-2 rounded-md text-sm ${isDowngrade ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                {isDowngrade
                  ? `You will be downgraded to ${selectedPlanData.name}. You will be charged ${formatNaira(selectedPlanData.priceKobo)} and the new limit applies immediately.`
                  : `You will be upgraded to ${selectedPlanData.name}. You will be charged ${formatNaira(selectedPlanData.priceKobo)} via Paystack.`
                }
              </div>
            )}

            {error && (
              <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToPayment}
                disabled={isLoading || selectedPlan === currentPlan}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Redirecting…
                  </>
                ) : (
                  'Pay & Upgrade'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">Payments are processed securely by Paystack</p>
          </div>
        </div>
      )}
    </>
  )
}
