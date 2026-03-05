'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import HealthBadge from '@/components/HealthBadge'

type ComponentStatus = 'up' | 'down' | 'unknown'

interface SystemHealthApiResponse {
  status: 'healthy' | 'degraded'
  timestamp: string
  uptime_ms: number
  response_time_ms: number
  components: {
    database: {
      status: ComponentStatus
      latency_ms: number | null
      message: string
      error?: string
    }
    redis: {
      status: ComponentStatus
      latency_ms: number | null
      message: string
      error?: string
    }
    queues: {
      note?: string
      [queueName: string]: any
    }
    workers: {
      note?: string
      [workerName: string]: any
    }
  }
}

interface SystemHealthView {
  status: 'healthy' | 'degraded' | 'down'
  lastChecked: string
  uptimeSeconds: number
  responseTimeMs: number
  components: {
    database: {
      status: 'healthy' | 'degraded' | 'down'
      latencyMs: number | null
      message: string
      error?: string
    }
    redis: {
      status: 'healthy' | 'degraded' | 'down'
      latencyMs: number | null
      message: string
      error?: string
    }
    queuesNote?: string
    workersNote?: string
    queues: Array<{ name: string; status: string; depth: number | null; processingRate: number | null }>
    workers: Array<{ name: string; status: string; jobsCompleted: number | null }>
  }
}

function toHealthStatus(status: ComponentStatus): 'healthy' | 'degraded' | 'down' {
  if (status === 'up') return 'healthy'
  if (status === 'down') return 'down'
  return 'degraded'
}

function normalizeHealth(data: SystemHealthApiResponse): SystemHealthView {
  const queuesNote = typeof data.components.queues?.note === 'string' ? data.components.queues.note : undefined
  const workersNote = typeof data.components.workers?.note === 'string' ? data.components.workers.note : undefined

  const queues = Object.entries(data.components.queues || {})
    .filter(([name]) => name !== 'note')
    .map(([name, value]) => ({
      name,
      status: String(value?.status ?? 'unknown'),
      depth: value?.depth ?? null,
      processingRate: value?.processing_rate ?? null,
    }))

  const workers = Object.entries(data.components.workers || {})
    .filter(([name]) => name !== 'note')
    .map(([name, value]) => ({
      name,
      status: String(value?.status ?? 'unknown'),
      jobsCompleted: value?.jobs_completed ?? null,
    }))

  return {
    status: data.status === 'healthy' ? 'healthy' : 'degraded',
    lastChecked: data.timestamp,
    uptimeSeconds: Math.floor(Number(data.uptime_ms ?? 0) / 1000),
    responseTimeMs: Number(data.response_time_ms ?? 0),
    components: {
      database: {
        status: toHealthStatus(data.components.database.status),
        latencyMs: data.components.database.latency_ms,
        message: data.components.database.message,
        error: data.components.database.error,
      },
      redis: {
        status: toHealthStatus(data.components.redis.status),
        latencyMs: data.components.redis.latency_ms,
        message: data.components.redis.message,
        error: data.components.redis.error,
      },
      queuesNote,
      workersNote,
      queues,
      workers,
    },
  }
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthView | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchHealth() {
    try {
      setIsLoading(true)
      const data = await api.get<SystemHealthApiResponse>(API_ENDPOINTS.SYSTEM_HEALTH)
      setHealth(normalizeHealth(data))
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load system health')
    } finally {
      setIsLoading(false)
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  const shimmer = 'h-5 bg-slate-700 rounded animate-pulse'

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Health</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isLoading || !health
              ? <span className="inline-block h-4 w-48 bg-slate-700 rounded animate-pulse" />
              : `Last checked: ${new Date(health.lastChecked).toLocaleString()}`}
          </p>
        </div>
        {isLoading || !health
          ? <span className="inline-block h-7 w-20 bg-slate-700 rounded-full animate-pulse" />
          : <HealthBadge status={health.status} />}
      </div>

      {/* Error banner — shown only if we have no data at all */}
      {error && !health && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Overview strip */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'System Uptime', value: isLoading || !health ? null : formatUptime(health.uptimeSeconds) },
            { label: 'Response Time', value: isLoading || !health ? null : `${health.responseTimeMs}ms` },
            { label: 'Overall Status', value: isLoading || !health ? null : health.status },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-sm text-slate-400">{label}</p>
              {value === null
                ? <div className={`${shimmer} mt-2 w-32`} />
                : label === 'Overall Status'
                  ? <div className="mt-2"><HealthBadge status={health!.status} /></div>
                  : <p className="text-2xl font-bold text-white mt-1">{value}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Component grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Database</h2>
            {isLoading || !health
              ? <span className="h-6 w-16 bg-slate-700 rounded-full animate-pulse inline-block" />
              : <HealthBadge status={health.components.database.status} />}
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-400">Response Time</p>
              {isLoading || !health
                ? <div className={`${shimmer} w-20 mt-1`} />
                : <p className="text-lg font-medium text-white">
                    {health.components.database.latencyMs === null ? '—' : `${health.components.database.latencyMs}ms`}
                  </p>}
            </div>
            <div>
              <p className="text-sm text-slate-400">Message</p>
              {isLoading || !health
                ? <div className={`${shimmer} w-48 mt-1`} />
                : <p className="text-sm text-slate-200">{health.components.database.message}</p>}
            </div>
            {health?.components.database.error && (
              <p className="text-sm text-red-400 break-all">{health.components.database.error}</p>
            )}
          </div>
        </div>

        {/* Redis */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Redis Cache</h2>
            {isLoading || !health
              ? <span className="h-6 w-16 bg-slate-700 rounded-full animate-pulse inline-block" />
              : <HealthBadge status={health.components.redis.status} />}
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-400">Response Time</p>
              {isLoading || !health
                ? <div className={`${shimmer} w-20 mt-1`} />
                : <p className="text-lg font-medium text-white">
                    {health.components.redis.latencyMs === null ? '—' : `${health.components.redis.latencyMs}ms`}
                  </p>}
            </div>
            <div>
              <p className="text-sm text-slate-400">Message</p>
              {isLoading || !health
                ? <div className={`${shimmer} w-48 mt-1`} />
                : <p className="text-sm text-slate-200">{health.components.redis.message}</p>}
            </div>
            {health?.components.redis.error && (
              <p className="text-sm text-red-400 break-all">{health.components.redis.error}</p>
            )}
          </div>
        </div>

        {/* Queues */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Queues</h2>
          {isLoading || !health
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded-lg animate-pulse mb-2" />
              ))
            : health.components.queues.length === 0
              ? <p className="text-sm text-slate-400">No queue metrics available.</p>
              : health.components.queues.map((q) => (
                  <div key={q.name} className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{q.name}</p>
                      <p className="text-xs text-slate-400">status: {q.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-300">depth: {q.depth ?? '—'}</p>
                      <p className="text-sm text-slate-300">rate: {q.processingRate ?? '—'}</p>
                    </div>
                  </div>
                ))
          }
        </div>

        {/* Workers */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Workers</h2>
          {isLoading || !health
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-700 rounded-lg animate-pulse mb-2" />
              ))
            : health.components.workers.length === 0
              ? <p className="text-sm text-slate-400">No worker metrics available.</p>
              : health.components.workers.map((w) => (
                  <div key={w.name} className="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{w.name}</p>
                      <p className="text-xs text-slate-400">status: {w.status}</p>
                    </div>
                    <p className="text-sm text-slate-300">jobs: {w.jobsCompleted ?? '—'}</p>
                  </div>
                ))
          }
        </div>
      </div>
    </div>
  )
}
