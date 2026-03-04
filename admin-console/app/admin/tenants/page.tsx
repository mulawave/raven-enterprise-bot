'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { API_ENDPOINTS, ROUTES } from '@/lib/constants'
import StatusBadge from '@/components/StatusBadge'

interface TenantApiItem {
  id: string
  name: string
  logo_url?: string | null
  created_at: string
  subscription?: {
    id: string
    plan_tier: string
    status: 'active' | 'trial' | 'cancelled' | 'pending' | 'suspended'
    conversations_used: number
    conversations_limit: number
    current_period_end: string
  } | null
  counts?: {
    orders: number
    bookings: number
    customers: number
  }
}

interface TenantsApiResponse {
  tenants: TenantApiItem[]
}

interface TenantRow {
  id: string
  name: string
  planTier: string
  subscriptionStatus: 'active' | 'trial' | 'cancelled' | 'pending' | 'suspended'
  createdAt: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      setIsLoading(true)
      const data = await api.get<TenantsApiResponse>(`${API_ENDPOINTS.TENANTS}?page=1&pageSize=50`)
      const rows: TenantRow[] = (data?.tenants ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        planTier: t.subscription?.plan_tier ?? 'N/A',
        subscriptionStatus: (t.subscription?.status ?? 'pending') as TenantRow['subscriptionStatus'],
        createdAt: t.created_at,
      }))
      setTenants(rows)
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants')
    } finally {
      setIsLoading(false)
    }
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
        <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
        <Link
          href={`${ROUTES.TENANTS}/new`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Create Tenant
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="h-4 w-36 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-16 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4" />
                  </tr>
                ))
              : tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{tenant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 capitalize">{tenant.planTier}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={tenant.subscriptionStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        href={`${ROUTES.TENANTS}/${tenant.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>

        {tenants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No tenants found</p>
          </div>
        )}
      </div>
    </div>
  )
}
