'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import StatCard from '@/components/StatCard'
import LoadingSkeleton from '@/components/LoadingSkeleton'

interface RevenueSummaryApiResponse {
  mrr: number
  mrr_formatted?: string
  arr: number
  arr_formatted?: string
  active_subscriptions?: number
  payment_count_30d?: number
  total_revenue_all_time?: number
  total_revenue_all_time_formatted?: string
}

interface RevenueSummaryViewModel {
  mrrFormatted: string
  arrFormatted: string
  totalRevenueFormatted: string
  paymentsCount30d: number
}

interface PaymentApiItem {
  id: string
  tenant?: { id: string; name: string }
  amount_kobo: number
  amount_formatted?: string
  status: string
  provider?: string
  reference?: string
  created_at: string
}

interface PaymentsApiResponse {
  payments: PaymentApiItem[]
}

interface PaymentRow {
  id: string
  tenantName: string
  amountFormatted: string
  status: string
  reference?: string
  provider?: string
  createdAt: string
}

export default function BillingPage() {
  const [summary, setSummary] = useState<RevenueSummaryViewModel | null>(null)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [summaryData, paymentsData] = await Promise.all([
          api.get<RevenueSummaryApiResponse>(API_ENDPOINTS.REVENUE_SUMMARY),
          api.get<PaymentsApiResponse>(`${API_ENDPOINTS.BILLING_PAYMENTS}?page=1&pageSize=20`),
        ])

        const normalizedSummary: RevenueSummaryViewModel = {
          mrrFormatted: summaryData?.mrr_formatted ?? `₦${Math.round((Number(summaryData?.mrr ?? 0) / 100)).toLocaleString()}`,
          arrFormatted: summaryData?.arr_formatted ?? `₦${Math.round((Number(summaryData?.arr ?? 0) / 100)).toLocaleString()}`,
          totalRevenueFormatted:
            summaryData?.total_revenue_all_time_formatted ??
            `₦${Math.round((Number(summaryData?.total_revenue_all_time ?? 0) / 100)).toLocaleString()}`,
          paymentsCount30d: Number(summaryData?.payment_count_30d ?? 0),
        }

        const normalizedPayments: PaymentRow[] = (paymentsData?.payments ?? []).map((p) => ({
          id: p.id,
          tenantName: p.tenant?.name ?? 'Unknown',
          amountFormatted: p.amount_formatted ?? `₦${Math.round((Number(p.amount_kobo ?? 0) / 100)).toLocaleString()}`,
          status: p.status,
          reference: p.reference,
          provider: p.provider,
          createdAt: p.created_at,
        }))

        setSummary(normalizedSummary)
        setPayments(normalizedPayments)
      } catch (err: any) {
        setError(err.message || 'Failed to load billing data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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
      <h1 className="text-3xl font-bold text-slate-900">Billing & Revenue</h1>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Monthly Recurring Revenue"
            value={summary.mrrFormatted}
            icon="💰"
          />
          <StatCard
            title="Annual Recurring Revenue"
            value={summary.arrFormatted}
            icon="📈"
          />
          <StatCard
            title="Total Revenue"
            value={summary.totalRevenueFormatted}
            icon="💵"
          />
          <StatCard
            title="Payments (30d)"
            value={summary.paymentsCount30d}
            icon="💳"
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Payments</h2>
        </div>

        {payments.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{payment.tenantName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{payment.amountFormatted}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600">
                      {payment.provider ? `${payment.provider} • ` : ''}{payment.reference ?? '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-600">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">No payments recorded yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
