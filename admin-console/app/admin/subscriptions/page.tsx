'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import StatusBadge from '@/components/StatusBadge'
import LoadingSkeleton from '@/components/LoadingSkeleton'

interface SubscriptionApiItem {
  id: string
  tenant: {
    id: string
    name: string
    created_at: string
  }
  plan_tier: string
  status: string
  conversations_used: number
  conversations_limit: number
  usage_percent: number
  overage_cost_kobo: number
  current_period_start: string
  current_period_end: string
  created_at: string
}

interface ListSubscriptionsApiResponse {
  subscriptions: SubscriptionApiItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface SubscriptionView {
  id: string
  tenantName: string
  planTier: string
  status: string
  conversationsUsed: number
  conversationsLimit: number
  usagePercent: number
  overageCostKobo: number
  currentPeriodStart: string
  currentPeriodEnd: string
}

function normalizeSubscription(item: SubscriptionApiItem): SubscriptionView {
  return {
    id: item.id,
    tenantName: item.tenant?.name || 'Unknown tenant',
    planTier: item.plan_tier,
    status: item.status,
    conversationsUsed: Number(item.conversations_used ?? 0),
    conversationsLimit: Number(item.conversations_limit ?? 0),
    usagePercent: Number(item.usage_percent ?? 0),
    overageCostKobo: Number(item.overage_cost_kobo ?? 0),
    currentPeriodStart: item.current_period_start,
    currentPeriodEnd: item.current_period_end,
  }
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled' | 'past_due'>('all')
  const [total, setTotal] = useState<number>(0)

  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        setIsLoading(true)
        const qs = new URLSearchParams({ page: '1', pageSize: '50' })
        if (filter !== 'all') qs.set('status', filter)

        const data = await api.get<ListSubscriptionsApiResponse>(`${API_ENDPOINTS.SUBSCRIPTIONS}?${qs.toString()}`)
        setSubscriptions((data.subscriptions || []).map(normalizeSubscription))
        setTotal(Number(data.total ?? 0))
      } catch (err: any) {
        setError(err.message || 'Failed to load subscriptions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptions()
  }, [filter])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-600 mt-1">{total.toLocaleString()} total</p>
        </div>
        <div className="flex space-x-2">
          {['all', 'active', 'past_due', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Overage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Period End
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {subscriptions.map((subscription) => (
              <tr key={subscription.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{subscription.tenantName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600 capitalize">{subscription.planTier}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={subscription.status as any} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">
                    {subscription.conversationsUsed.toLocaleString()} / {subscription.conversationsLimit.toLocaleString()}
                  </div>
                  <div className="w-32 bg-slate-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{
                        width: `${
                          subscription.conversationsLimit > 0
                            ? Math.min(100, (subscription.conversationsUsed / subscription.conversationsLimit) * 100)
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">₦{(subscription.overageCostKobo / 100).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No subscriptions found</p>
          </div>
        )}
      </div>
    </div>
  )
}
