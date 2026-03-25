'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import StatusBadge from '@/components/StatusBadge'

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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-600 mt-1">
            {isLoading
              ? <span className="inline-block h-4 w-16 rounded bg-slate-200 animate-pulse" />
              : `${total.toLocaleString()} total`}
          </p>
        </div>
        <div className="flex space-x-2 flex-wrap gap-y-2">
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

      {/* Mobile card layout */}
      <div className="lg:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="h-4 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />
                <div className="h-2 w-full rounded bg-slate-200 animate-pulse" />
              </div>
            ))
          : subscriptions.length === 0
            ? <div className="bg-white border border-slate-200 rounded-xl px-4 py-12 text-center text-slate-500">No subscriptions found</div>
            : subscriptions.map((sub) => (
                <div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{sub.tenantName}</p>
                    <StatusBadge status={sub.status as any} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 capitalize">{sub.planTier}</span>
                    <span className="text-slate-900 font-medium">₦{(sub.overageCostKobo / 100).toLocaleString()} overage</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Usage</span>
                      <span>{sub.conversationsUsed.toLocaleString()} / {sub.conversationsLimit.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${sub.conversationsLimit > 0 ? Math.min(100, (sub.conversationsUsed / sub.conversationsLimit) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
                </div>
              ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-x-auto border border-slate-200">
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
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-28 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-16 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-5 w-16 rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" /></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 w-24 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer mb-1.5" />
                      <div className="w-32 h-1.5 rounded-full bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-16 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-20 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" /></td>
                  </tr>
                ))
              : subscriptions.map((subscription) => (
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

      {!isLoading && subscriptions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No subscriptions found</p>
        </div>
      )}
      </div>
    </div>
  )
}
