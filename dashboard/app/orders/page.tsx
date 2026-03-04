'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatNaira, formatDate } from '@/lib/formatters'
import { useTenantContext } from '@/lib/tenant-context'
import OrderStatusDropdown from '@/components/OrderStatusDropdown'

interface Order {
  id: string
  customerName: string
  items: Array<{ name: string; quantity: number }>
  totalAmount: number
  status: string
  createdAt: string
}

const SHIMMER_ROWS = Array.from({ length: 5 })

export default function OrdersPage() {
  const { tenant } = useTenantContext()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 border-b border-red-100 bg-red-50">{error}</div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.items?.map(item => `${item.name} (${item.quantity})`).join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNaira(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OrderStatusDropdown orderId={order.id} currentStatus={order.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
