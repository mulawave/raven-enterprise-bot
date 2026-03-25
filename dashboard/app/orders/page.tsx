'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatNaira, formatDate } from '@/lib/formatters'
import { useTenantContext } from '@/lib/tenant-context'
import OrderStatusDropdown from '@/components/OrderStatusDropdown'

interface OrderItem {
  quantity: number
  price_kobo: number
  menuItem: { name: string } | null
}

interface Order {
  id: string
  total_kobo: number
  status: string
  created_at: string
  customer: { name: string | null; phone: string | null; email: string | null } | null
  orderItems: OrderItem[]
}

const SHIMMER_ROWS = Array.from({ length: 5 })

export default function OrdersPage() {
  const { tenant } = useTenantContext()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await api<Order[]>(`/api/ordering/orders?tenantId=${tenant?.id ?? ''}`)
        if (isActive) setOrders(Array.isArray(data) ? data : [])
      } catch {
        if (isActive) setError('Failed to load orders')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (tenant?.id) load()

    return () => { isActive = false }
  }, [tenant?.id])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 ring-1 ring-amber-200">
          <span className="text-lg">📦</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : `${orders.length} total order${orders.length !== 1 ? 's' : ''}`}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {error && (
          <div className="px-5 py-3 text-sm text-red-700 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" /></svg>
            {error}
          </div>
        )}
        {statusError && (
          <div className="px-5 py-3 text-sm text-red-700 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" /></svg>
            {statusError}
          </div>
        )}

        {/* Mobile card layout */}
        <div className="lg:hidden divide-y divide-gray-100">
          {isLoading
            ? SHIMMER_ROWS.map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-gray-100 animate-pulse" />
                </div>
              ))
            : orders.length === 0
            ? <div className="px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200 mx-auto mb-3"><span className="text-2xl">📦</span></div>
                <p className="text-sm font-medium text-gray-500">No orders yet</p>
                <p className="text-xs text-gray-400 mt-1">Orders will appear here when customers purchase</p>
              </div>
            : orders.map((order) => (
                <div key={order.id} className="p-4 space-y-2 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {order.customer?.name ?? 'Unknown'}
                    </p>
                    <OrderStatusDropdown orderId={order.id} currentStatus={order.status} onError={(msg) => setStatusError(msg)} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {order.orderItems?.length
                      ? order.orderItems.map(item => `${item.menuItem?.name ?? 'Item'} ×${item.quantity}`).join(', ')
                      : '—'}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-900">{formatNaira(order.total_kobo)}</p>
                    <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Desktop table layout */}
        <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
            <tr>
              {['Customer', 'Items', 'Total', 'Status', 'Date'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading
              ? SHIMMER_ROWS.map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : orders.length === 0
              ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No orders yet
                    </td>
                  </tr>
                )
              : orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.customer?.name ?? <span className="italic text-gray-400">Unknown</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.orderItems?.length
                        ? order.orderItems.map(item => `${item.menuItem?.name ?? 'Item'} ×${item.quantity}`).join(', ')
                        : <span className="italic text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNaira(order.total_kobo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OrderStatusDropdown orderId={order.id} currentStatus={order.status} onError={(msg) => setStatusError(msg)} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
