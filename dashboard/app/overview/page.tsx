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
  totalAmount: number
}

export default function OverviewPage() {
  const { subscription, tenant } = useTenantContext()
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    let isActive = true

    const loadOrders = async () => {
      try {
        const data = await api<Order[]>(`/api/ordering/orders?tenantId=${tenant?.id ?? ''}`).catch(() => [])
        if (isActive) {
          setOrders(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        // Ignore load errors for empty-state display
      }
    }

    loadOrders()

    return () => {
      isActive = false
    }
  }, [tenant.id])

  const { totalRevenue, orderCount } = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status === 'completed' || o.status === 'paid')
    const revenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    return { totalRevenue: revenue, orderCount: orders.length }
  }, [orders])

  const renewalDate = formatDate(subscription?.current_period_end ?? '')
  const usagePercent = Math.round(
    ((subscription?.conversations_used ?? 0) / (subscription?.conversations_limit || 1)) * 100,
  )
  const usageDisplay = `${subscription?.conversations_used ?? 0} / ${subscription?.conversations_limit ?? 0}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <p className="text-xl font-semibold text-gray-900">
                {((subscription?.plan ?? 'starter').charAt(0).toUpperCase() + (subscription?.plan ?? 'starter').slice(1))} Plan
              </p>
              <p className="mt-1 text-sm text-gray-500">Renews {renewalDate}</p>
            </div>
            <div className="text-sm text-gray-500">
              {usagePercent}% used
            </div>
          </div>
          <div className="mt-4">
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
          icon="ðŸ’¬"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <StatCard title="Total Orders" value={orderCount} icon="ðŸ›’" />
        <StatCard
          title="Revenue"
          value={formatNaira(totalRevenue)}
          subtitle="From completed orders"
          icon="ðŸ’°"
        />
      </div>
    </div>
  )
}

