'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatNaira, formatDate } from '@/lib/formatters'
import { useTenantContext } from '@/lib/tenant-context'

interface Payment {
  id: string
  orderId?: string
  bookingId?: string
  customerName: string
  amount: number
  status: string
  provider: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
}

const SHIMMER_ROWS = Array.from({ length: 5 })

export default function PaymentsPage() {
  const { tenant } = useTenantContext()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await api<Payment[]>(`/api/payments/status?tenantId=${tenant?.id ?? ''}`)
        if (isActive) setPayments(Array.isArray(data) ? data : [])
      } catch {
        if (isActive) setError('Failed to load payments')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (tenant?.id) load()

    return () => { isActive = false }
  }, [tenant?.id])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payments</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 border-b border-red-100 bg-red-50">{error}</div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Customer', 'Amount', 'Provider', 'Status', 'Date'].map((h) => (
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
                        <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : payments.length === 0
              ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No payment transactions yet
                    </td>
                  </tr>
                )
              : payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNaira(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        STATUS_COLORS[payment.status] ?? 'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.createdAt)}
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
