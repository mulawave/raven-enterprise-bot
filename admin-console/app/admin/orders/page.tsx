'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'

interface OrderItem {
  id: string
  quantity: number
  price_kobo: number
}

interface Order {
  id: string
  status: string
  total_kobo: number
  created_at: string
  customer: { id: string; name: string | null; phone: string | null; email: string | null } | null
  tenant: { id: string; name: string } | null
  orderItems: OrderItem[]
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  confirmed: 'bg-blue-900/40 text-blue-300 border-blue-700',
  preparing: 'bg-purple-900/40 text-purple-300 border-purple-700',
  ready: 'bg-teal-900/40 text-teal-300 border-teal-700',
  delivered: 'bg-green-900/40 text-green-300 border-green-700',
  cancelled: 'bg-red-900/40 text-red-300 border-red-700',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status.toLowerCase()] ?? 'bg-slate-700 text-slate-300 border-slate-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cls}`}>
      {status}
    </span>
  )
}

function koboToNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

function Shimmer({ className }: { className?: string }) {
  return <div className={`bg-slate-700 rounded animate-pulse ${className ?? ''}`} />
}

export default function OrdersPage() {
  const [data, setData] = useState<OrdersResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const limit = 50

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await api.get<OrdersResponse>(`${API_ENDPOINTS.ORDERS_LIST}?page=${page}&limit=${limit}`)
      setData(result)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          {isLoading || !data
            ? <Shimmer className="h-4 w-32 mt-1" />
            : <p className="text-sm text-slate-400 mt-1">{data.total.toLocaleString()} total orders</p>}
        </div>
        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm text-slate-200 rounded-lg transition-colors"
        >
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && !data && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Mobile card layout */}
      <div className="lg:hidden space-y-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-3 w-2/3" />
              </div>
            ))
          : data?.orders.length === 0
            ? <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-12 text-center text-slate-400">No orders found.</div>
            : data?.orders.map((order) => (
                <div key={order.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{order.customer?.name ?? '—'}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">{order.id.slice(0, 8)}…</span>
                    <span className="text-white font-semibold">{koboToNaira(order.total_kobo)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{order.tenant?.name ?? '—'}</span>
                    <span>{order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}</span>
                  </div>
                  {order.customer?.phone && <p className="text-xs text-slate-500">{order.customer.phone}</p>}
                  <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              ))
        }
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-slate-400 font-medium">Order ID</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Customer</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Tenant</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Items</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Total</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <Shimmer className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.orders.length === 0
                ? <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No orders found.</td>
                  </tr>
                : data?.orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-300 max-w-[100px] truncate" title={order.id}>
                        {order.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{order.customer?.name ?? '—'}</div>
                        <div className="text-xs text-slate-400">{order.customer?.phone ?? order.customer?.email ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{order.tenant?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-300">{order.orderItems.length}</td>
                      <td className="px-4 py-3 text-white font-semibold">{koboToNaira(order.total_kobo)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages} &mdash; {data.total.toLocaleString()} orders
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-sm text-slate-200 rounded-lg transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-sm text-slate-200 rounded-lg transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
