'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useTenantContext } from '@/lib/tenant-context'

interface AnalyticsSummary {
  orders: number
  bookings: number
  customers: number
  conversations: number
  contacts: number
  payments: number
}

interface StatCard {
  label: string
  key: keyof AnalyticsSummary
  icon: string
  color: string
  bg: string
}

const CARDS: StatCard[] = [
  { label: 'Total Orders',        key: 'orders',        icon: '🛒', color: 'text-blue-600',    bg: 'bg-blue-50'   },
  { label: 'Total Bookings',      key: 'bookings',      icon: '📅', color: 'text-violet-600',  bg: 'bg-violet-50' },
  { label: 'Total Customers',     key: 'customers',     icon: '👥', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Conversations',       key: 'conversations', icon: '💬', color: 'text-sky-600',     bg: 'bg-sky-50'    },
  { label: 'Contacts',            key: 'contacts',      icon: '📇', color: 'text-amber-600',   bg: 'bg-amber-50'  },
  { label: 'Successful Payments', key: 'payments',      icon: '💳', color: 'text-green-600',   bg: 'bg-green-50'  },
]

export default function AnalyticsPage() {
  const { tenant } = useTenantContext()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await api<AnalyticsSummary>(
          `/api/analytics/summary`
        )
        if (isActive) setSummary(data)
      } catch {
        if (isActive) setError('Failed to load analytics')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (tenant?.id) load()

    return () => { isActive = false }
  }, [tenant?.id])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
      <p className="text-sm text-gray-500 mb-8">Lifetime totals for your tenant</p>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CARDS.map((card) => (
          <div
            key={card.key}
            className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-5"
          >
            {isLoading ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-24 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                  <div className="h-8 w-16 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer" />
                </div>
              </>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${card.bg}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color}`}>
                    {summary ? summary[card.key].toLocaleString() : '—'}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
