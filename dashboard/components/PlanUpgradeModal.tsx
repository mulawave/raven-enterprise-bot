'use client'

import { useState } from 'react'
import { useTenantContext } from '@/lib/tenant-context'

interface PlanUpgradeModalProps {
  currentPlan: string
  onUpgradeSuccess?: () => void
}

const PLANS = [
  { tier: 'free', name: 'Free', conversations: 100 },
  { tier: 'starter', name: 'Starter', conversations: 1000 },
  { tier: 'professional', name: 'Professional', conversations: 5000 },
  { tier: 'enterprise', name: 'Enterprise', conversations: 20000 },
]

export default function PlanUpgradeModal({ currentPlan, onUpgradeSuccess }: PlanUpgradeModalProps) {
  const { tenant } = useTenantContext()
  const isSuspended = tenant.status === 'SUSPENDED'
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(currentPlan)
  const [upgrading, setUpgrading] = useState(false)

  const handleUpgrade = async () => {
    if (isSuspended) return
    if (selectedPlan === currentPlan) {
      setIsOpen(false)
      return
    }

    setUpgrading(true)
    try {
      const response = await fetch('http://localhost:4000/subscriptions/plan', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant.id,
          newPlanTier: selectedPlan,
        }),
      })

      if (response.ok) {
        onUpgradeSuccess?.()
        setIsOpen(false)
      } else {
        alert('Failed to upgrade plan')
      }
    } catch (error) {
      alert('Failed to upgrade plan')
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isSuspended}
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Change Plan
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Change Subscription Plan</h3>

            <div className="space-y-3 mb-6">
              {PLANS.map((plan) => (
                <label
                  key={plan.tier}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlan === plan.tier
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.tier}
                    checked={selectedPlan === plan.tier}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <p className="text-sm text-gray-600">{plan.conversations.toLocaleString()} conversations/month</p>
                  </div>
                  {plan.tier === currentPlan && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Current</span>
                  )}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={upgrading || selectedPlan === currentPlan}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {upgrading ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
