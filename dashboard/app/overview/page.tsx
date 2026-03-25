"use client"

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { formatNaira, formatDate } from '@/lib/formatters'
import StatCard from '@/components/StatCard'
import { useTenantContext } from '@/lib/tenant-context'
import UsageMeter from '@/components/UsageMeter'

interface Order {
  id: string
  status: string
  total_kobo: number
}

export default function OverviewPage() {
  const { subscription, tenant } = useTenantContext()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const loadOrders = async () => {
      try {
        const data = await api<Order[]>(`/api/ordering/orders?tenantId=${tenant?.id ?? ''}`)
        if (isActive) {
          setOrders(Array.isArray(data) ? data : [])
        }
      } catch {
        // Show empty state on load failure
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadOrders()

    return () => {
      isActive = false
    }
  }, [tenant.id])

  const { totalRevenue, orderCount } = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status === 'completed' || o.status === 'paid')
    const revenue = paidOrders.reduce((sum, o) => sum + o.total_kobo, 0)
    return { totalRevenue: revenue, orderCount: orders.length }
  }, [orders])

  const renewalDate = formatDate(subscription?.current_period_end ?? '')
  const usagePercent = Math.round(
    ((subscription?.conversations_used ?? 0) / (subscription?.conversations_limit || 1)) * 100,
  )
  const usageDisplay = `${subscription?.conversations_used ?? 0} / ${subscription?.conversations_limit ?? 0}`

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200">
          <span className="text-lg">📊</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500">Your business at a glance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 border-t-4 border-t-indigo-500 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Current Plan</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {((subscription?.plan ?? 'starter').charAt(0).toUpperCase() + (subscription?.plan ?? 'starter').slice(1))} Plan
              </p>
              <p className="mt-1 text-sm text-gray-500">Renews {renewalDate}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${usagePercent >= 90 ? 'bg-red-100 text-red-700' : usagePercent >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {usagePercent}% used
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <UsageMeter
              label="Conversations"
              used={subscription?.conversations_used ?? 0}
              limit={subscription?.conversations_limit ?? 1}
              unit="conversations"
            />
          </div>
        </div>
        <StatCard
          title="Conversations"
          value={usageDisplay}
          subtitle={`${usagePercent}% used`}
          icon="💬"
          accentColor="sky"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-sm">
              <div className="h-4 w-24 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
              <div className="h-8 w-32 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
            </div>
          ))
        ) : (
          <>
            <StatCard title="Total Orders" value={orderCount} icon="🛒" accentColor="blue" />
            <StatCard
              title="Revenue"
              value={formatNaira(totalRevenue)}
              subtitle="From completed orders"
              icon="💰"
              accentColor="green"
            />
          </>
        )}
      </div>
    </div>
  )
}

