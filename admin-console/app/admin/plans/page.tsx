'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import LoadingSkeleton from '@/components/LoadingSkeleton'

interface Plan {
  tier: string
  name: string
  price_kobo: number
  price_formatted: string
  conversations_limit: number
  overage_price_kobo: number
  overage_price_formatted: string
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlans() {
      try {
        setIsLoading(true)
        const response = await api.get<{ plans: Plan[] }>(API_ENDPOINTS.PLANS)
        setPlans(response.plans || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load plans')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlans()
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.tier} className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">{plan.name}</h2>

            <div className="mt-4">
              <span className="text-4xl font-bold text-slate-900">{plan.price_formatted}</span>
              <span className="text-slate-600">/month</span>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm text-slate-700">
                  {plan.conversations_limit === -1 ? 'Unlimited' : plan.conversations_limit.toLocaleString()} conversations/month
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm text-slate-700">
                  Overage: {plan.overage_price_formatted} per extra conversation
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm text-slate-700">White Label & Branding</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm text-slate-700">AI-Powered Messaging</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 border border-slate-200 text-center">
          <p className="text-slate-500">No plans configured</p>
        </div>
      )}
    </div>
  )
}
