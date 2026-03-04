'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import LoadingSkeleton from '@/components/LoadingSkeleton'

interface OrderStats {
  total_orders: number
  orders_24h: number
  by_status: Array<{ status: string; _count: { id: number } }>
}

export default function OrdersPage() {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      try {
        setIsLoading(true)
        const data = await api.get<OrderStats>(API_ENDPOINTS.ORDERS)
        setStats(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load order stats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
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
      <h1 className="text-3xl font-bold text-slate-900">Orders Statistics</h1>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Total Orders</h3>
            <p className="text-3xl font-bold text-slate-900 mt-2">{stats.total_orders.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Orders (Last 24h)</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.orders_24h.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">By Status</h3>
            <div className="mt-2 space-y-1">
              {stats.by_status.map((item) => (
                <div key={item.status} className="flex justify-between text-sm">
                  <span className="text-slate-600 capitalize">{item.status}</span>
                  <span className="font-semibold text-slate-900">{item._count.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
