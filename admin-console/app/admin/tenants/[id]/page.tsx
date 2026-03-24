'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { API_ENDPOINTS, ROUTES } from '@/lib/constants'
import StatusBadge from '@/components/StatusBadge'

type TenantApiError = { error: { code: string; message: string } }

interface TenantApiResponse {
  id: string
  name: string
  logo_url?: string | null
  theme?: string | null
  created_at: string
  updated_at: string
  subscription?: {
    id: string
    tenant_id: string
    plan_tier: string
    status: string
    current_period_start: string
    current_period_end: string
    conversations_used: number
    conversations_limit: number
    overage_cost_kobo: number
    created_at: string
    updated_at: string
  } | null
  users: Array<{
    id: string
    email: string
    role: string
    scope: string
    created_at: string
  }>
  _count?: {
    orders: number
    bookings: number
    customers: number
    conversations: number
    messages: number
  }
}

interface TenantDetail {
  id: string
  name: string
  logoUrl?: string
  theme?: string
  createdAt: string
  updatedAt: string
  subscription?: {
    planTier: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    conversationsUsed: number
    conversationsLimit: number
    overageCostKobo: number
  } | null
  users: Array<{
    id: string
    email: string
    role: string
    scope: string
    createdAt: string
  }>
  counts: {
    orders: number
    bookings: number
    customers: number
    conversations: number
    messages: number
  }
}

function normalizeTenant(data: TenantApiResponse): TenantDetail {
  return {
    id: data.id,
    name: data.name,
    logoUrl: data.logo_url || undefined,
    theme: data.theme || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    subscription: data.subscription
      ? {
          planTier: data.subscription.plan_tier,
          status: data.subscription.status,
          currentPeriodStart: data.subscription.current_period_start,
          currentPeriodEnd: data.subscription.current_period_end,
          conversationsUsed: Number(data.subscription.conversations_used ?? 0),
          conversationsLimit: Number(data.subscription.conversations_limit ?? 0),
          overageCostKobo: Number(data.subscription.overage_cost_kobo ?? 0),
        }
      : null,
    users: (data.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      scope: u.scope,
      createdAt: u.created_at,
    })),
    counts: {
      orders: Number(data._count?.orders ?? 0),
      bookings: Number(data._count?.bookings ?? 0),
      customers: Number(data._count?.customers ?? 0),
      conversations: Number(data._count?.conversations ?? 0),
      messages: Number(data._count?.messages ?? 0),
    },
  }
}

export default function TenantDetailPage() {
  const params = useParams()
  const tenantId = params.id as string
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'users'>('overview')

  useEffect(() => {
    async function fetchTenant() {
      try {
        setIsLoading(true)
        const data = await api.get<TenantApiResponse | TenantApiError>(`${API_ENDPOINTS.TENANTS}/${tenantId}`)

        if ((data as TenantApiError).error) {
          setError((data as TenantApiError).error.message)
          setTenant(null)
          return
        }

        setTenant(normalizeTenant(data as TenantApiResponse))
      } catch (err: any) {
        setError(err.message || 'Failed to load tenant details')
      } finally {
        setIsLoading(false)
      }
    }

    if (tenantId) {
      fetchTenant()
    }
  }, [tenantId])

  if (!isLoading && (error || !tenant)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Tenant not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {isLoading
            ? <div className="h-9 w-52 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
            : <h1 className="text-3xl font-bold text-slate-900">{tenant!.name}</h1>
          }
          <p className="text-slate-600 mt-1">Tenant details &amp; access</p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && <StatusBadge status={(tenant!.subscription?.status as any) || 'pending'} />}
          {!isLoading && (
            <Link
              href={`${ROUTES.TENANTS}/${tenantId}/reset`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Tenant
            </Link>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {['overview', 'subscription', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-16 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                  <div className="h-5 w-40 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                </div>
              ))}
            </div>
            <div>
              <div className="h-3.5 w-24 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                    <div className="h-3 w-12 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                    <div className="h-7 w-10 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : tenant ? (
          <>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500">Tenant ID</h3>
                <p className="mt-1 text-sm text-slate-900 break-all">{tenant.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">Created</h3>
                <p className="mt-1 text-sm text-slate-900">{new Date(tenant.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">Updated</h3>
                <p className="mt-1 text-sm text-slate-900">{new Date(tenant.updatedAt).toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-500">Logo</h3>
                <p className="mt-1 text-sm text-slate-900 break-all">{tenant.logoUrl || 'Not set'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Activity counts</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {([
                  ['Orders', tenant.counts.orders],
                  ['Bookings', tenant.counts.bookings],
                  ['Customers', tenant.counts.customers],
                  ['Conversations', tenant.counts.conversations],
                  ['Messages', tenant.counts.messages],
                ] as Array<[string, number]>).map(([label, value]) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>


          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-4">
            {!tenant.subscription ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700">No subscription found for this tenant.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500">Plan tier</h3>
                    <p className="mt-1 text-sm text-slate-900 capitalize">{tenant.subscription.planTier}</p>
                  </div>
                  <StatusBadge status={tenant.subscription.status as any} size="sm" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500">Current period</h3>
                    <p className="mt-1 text-sm text-slate-900">
                      {new Date(tenant.subscription.currentPeriodStart).toLocaleDateString()} →{' '}
                      {new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500">Overage cost</h3>
                    <p className="mt-1 text-sm text-slate-900">
                      ₦{(tenant.subscription.overageCostKobo / 100).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Conversations</span>
                    <span className="text-sm text-slate-600">
                      {tenant.subscription.conversationsUsed.toLocaleString()} /{' '}
                      {tenant.subscription.conversationsLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${
                          tenant.subscription.conversationsLimit > 0
                            ? Math.min(
                                100,
                                (tenant.subscription.conversationsUsed / tenant.subscription.conversationsLimit) * 100,
                              )
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Users</h3>
              <p className="text-sm text-slate-500">{tenant.users.length} total</p>
            </div>

            {tenant.users.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700">No users found for this tenant.</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Scope</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {tenant.users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">{u.email}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{u.role}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{u.scope}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{new Date(u.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
          </>
        ) : null}
      </div>

    </div>
  )
}
