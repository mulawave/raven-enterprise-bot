'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS, ROUTES } from '@/lib/constants'
import HealthBadge from '@/components/HealthBadge'
import Link from 'next/link'

interface RevenueSummary {
  mrr: number
  arr: number
  totalRevenue: number
  activeSubscriptions: number
  mrrFormatted?: string
  arrFormatted?: string
  totalRevenueFormatted?: string
}

interface RevenueSummaryApiResponse {
  mrr: number
  mrr_formatted?: string
  arr: number
  arr_formatted?: string
  active_subscriptions?: number
  total_revenue_all_time?: number
  total_revenue_all_time_formatted?: string
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down'
  database: 'healthy' | 'degraded' | 'down'
  redis: 'healthy' | 'degraded' | 'down'
}

interface SystemHealthApiResponse {
  status?: 'healthy' | 'degraded' | 'down'
  components?: {
    database?: { status?: 'up' | 'down' }
    redis?: { status?: 'up' | 'down' }
  }
}

interface MessagingStats {
  sent24h: number
  totalMessages: number
  totalConversations: number
  activeConversations24h: number
}

interface MessagingStatsApiResponse {
  messages_24h?: number
  total_messages?: number
  total_conversations?: number
  active_conversations_24h?: number
}

function mapStatus(s?: string): 'healthy' | 'degraded' | 'down' {
  if (s === 'up') return 'healthy'
  if (s === 'down') return 'down'
  return 'degraded'
}

function Shimmer({ className }: { className?: string }) {
  return <div className={`bg-slate-200 rounded animate-pulse ${className ?? ''}`} />
}

function MetricCard({
  title, value, icon, accent, loading, href,
}: {
  title: string
  value: string | number
  icon: string
  accent: string
  loading: boolean
  href?: string
}) {
  const inner = (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-3 shadow-sm hover:border-slate-300 hover:shadow-md transition-all ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`h-2 w-2 rounded-full ${accent}`} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        {loading
          ? <Shimmer className="h-8 w-28 mt-2" />
          : <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function AdminOverviewPage() {
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [messaging, setMessaging] = useState<MessagingStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      setIsLoading(true)
      const [revenueData, healthData, messagingData] = await Promise.all([
        api.get<RevenueSummaryApiResponse>(API_ENDPOINTS.REVENUE_SUMMARY),
        api.get<SystemHealthApiResponse>(API_ENDPOINTS.SYSTEM_HEALTH),
        api.get<MessagingStatsApiResponse>(API_ENDPOINTS.OPS_MESSAGING_STATS),
      ])

      setRevenue({
        mrr: Number(revenueData?.mrr ?? 0),
        arr: Number(revenueData?.arr ?? 0),
        totalRevenue: Number(revenueData?.total_revenue_all_time ?? 0),
        activeSubscriptions: Number(revenueData?.active_subscriptions ?? 0),
        mrrFormatted: revenueData?.mrr_formatted,
        arrFormatted: revenueData?.arr_formatted,
        totalRevenueFormatted: revenueData?.total_revenue_all_time_formatted,
      })

      setHealth({
        status: healthData?.status ?? 'degraded',
        database: mapStatus(healthData?.components?.database?.status),
        redis: mapStatus(healthData?.components?.redis?.status),
      })

      setMessaging({
        sent24h: Number(messagingData?.messages_24h ?? 0),
        totalMessages: Number(messagingData?.total_messages ?? 0),
        totalConversations: Number(messagingData?.total_conversations ?? 0),
        activeConversations24h: Number(messagingData?.active_conversations_24h ?? 0),
      })

      setError(null)
      setLoadedAt(new Date())
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loadedAt ? `Updated ${loadedAt.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && health && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              <span className="text-sm text-slate-500">System</span>
              <HealthBadge status={health.status} />
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-50 text-sm text-slate-700 rounded-xl transition-colors shadow-sm"
          >
            {isLoading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Error notice — inline, non-blocking */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="text-red-600 hover:text-red-800 underline text-xs">Retry</button>
        </div>
      )}

      {/* Revenue KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Monthly Recurring Revenue"
            value={revenue?.mrrFormatted ?? `₦${Math.round((revenue?.mrr ?? 0) / 100).toLocaleString()}`}
            icon="💰" accent="bg-emerald-500" loading={isLoading}
            href={ROUTES.BILLING}
          />
          <MetricCard
            title="Annual Recurring Revenue"
            value={revenue?.arrFormatted ?? `₦${Math.round((revenue?.arr ?? 0) / 100).toLocaleString()}`}
            icon="📈" accent="bg-blue-500" loading={isLoading}
            href={ROUTES.BILLING}
          />
          <MetricCard
            title="Total Revenue"
            value={revenue?.totalRevenueFormatted ?? `₦${Math.round((revenue?.totalRevenue ?? 0) / 100).toLocaleString()}`}
            icon="💵" accent="bg-purple-500" loading={isLoading}
            href={ROUTES.BILLING}
          />
          <MetricCard
            title="Active Subscriptions"
            value={revenue?.activeSubscriptions?.toLocaleString() ?? '0'}
            icon="📋" accent="bg-yellow-500" loading={isLoading}
            href={ROUTES.SUBSCRIPTIONS}
          />
        </div>
      </section>

      {/* Messaging KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Messaging</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Messages (24h)" value={messaging?.sent24h?.toLocaleString() ?? '0'} icon="📨" accent="bg-blue-500" loading={isLoading} href={ROUTES.OPS} />
          <MetricCard title="Active Conversations (24h)" value={messaging?.activeConversations24h?.toLocaleString() ?? '0'} icon="💬" accent="bg-teal-500" loading={isLoading} href={ROUTES.OPS} />
          <MetricCard title="Total Messages" value={messaging?.totalMessages?.toLocaleString() ?? '0'} icon="📬" accent="bg-slate-400" loading={isLoading} href={ROUTES.OPS} />
          <MetricCard title="Total Conversations" value={messaging?.totalConversations?.toLocaleString() ?? '0'} icon="🗂️" accent="bg-indigo-500" loading={isLoading} href={ROUTES.OPS} />
        </div>
      </section>

      {/* System Health + Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component Health */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">Component Health</h2>
            <Link href={ROUTES.SYSTEM} className="text-xs text-blue-600 hover:text-blue-700">View details →</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Database', status: health?.database, icon: '🗄️' },
              { label: 'Redis', status: health?.redis, icon: '⚡' },
              { label: 'AI Engine', status: 'healthy' as const, icon: '🤖' },
              { label: 'WhatsApp', status: 'healthy' as const, icon: '📱' },
            ].map(({ label, status, icon }) => (
              <div key={label} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                {isLoading || !status
                  ? <Shimmer className="h-5 w-14 rounded-full" />
                  : <HealthBadge status={status} />}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'View Tenants', href: ROUTES.TENANTS, icon: '🏢' },
              { label: 'Manage Plans', href: ROUTES.PLANS, icon: '💎' },
              { label: 'Browse Orders', href: ROUTES.ORDERS, icon: '📦' },
              { label: 'Browse Customers', href: ROUTES.CUSTOMERS, icon: '👤' },
              { label: 'Operations', href: ROUTES.OPS, icon: '⚙️' },
            ].map(({ label, href, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-sm text-slate-700 hover:text-slate-900 transition-all group"
              >
                <span className="text-lg">{icon}</span>
                <span className="font-medium">{label}</span>
                <span className="ml-auto text-slate-400 group-hover:text-slate-600">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
