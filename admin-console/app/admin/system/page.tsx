'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import HealthBadge from '@/components/HealthBadge'
import LoadingSkeleton from '@/components/LoadingSkeleton'

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
    const interval = setInterval(fetchHealth, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  async function fetchHealth() {
    try {
      setIsLoading(true)
      const data = await api.get<SystemHealthApiResponse>(API_ENDPOINTS.SYSTEM_HEALTH)
      setHealth(normalizeHealth(data))
    } catch (err: any) {
      setError(err.message || 'Failed to load system health')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !health) {
    return <LoadingSkeleton />
  }

  if (error && !health) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  if (!health) return null

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
          <p className="text-sm text-slate-600 mt-1">
            Last checked: {new Date(health.lastChecked).toLocaleString()}
          </p>
        </div>
        <HealthBadge status={health.status} />
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600">System Uptime</p>
            <p className="text-2xl font-bold text-slate-900">{formatUptime(health.uptimeSeconds)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Response Time</p>
            <p className="text-2xl font-bold text-slate-900">{health.responseTimeMs}ms</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Overall Status</p>
            <div className="mt-2">
              <HealthBadge status={health.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Database</h2>
            <HealthBadge status={health.components.database.status} />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-600">Response Time</p>
              <p className="text-lg font-medium text-slate-900">
                {health.components.database.latencyMs === null ? '—' : `${health.components.database.latencyMs}ms`}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Message</p>
              <p className="text-sm text-slate-900">{health.components.database.message}</p>
            </div>
            {health.components.database.error && (
              <div>
                <p className="text-sm text-slate-600">Error</p>
                <p className="text-sm text-red-700 break-all">{health.components.database.error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Redis Cache</h2>
            <HealthBadge status={health.components.redis.status} />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-600">Response Time</p>
              <p className="text-lg font-medium text-slate-900">
                {health.components.redis.latencyMs === null ? '—' : `${health.components.redis.latencyMs}ms`}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Message</p>
              <p className="text-sm text-slate-900">{health.components.redis.message}</p>
            </div>
            {health.components.redis.error && (
              <div>
                <p className="text-sm text-slate-600">Error</p>
                <p className="text-sm text-red-700 break-all">{health.components.redis.error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Queues</h2>
            <HealthBadge status={health.status === 'healthy' ? 'healthy' : 'degraded'} label="Instrument" />
          </div>
          {health.components.queuesNote && <p className="text-sm text-slate-600 mb-3">{health.components.queuesNote}</p>}
          <div className="space-y-2">
            {health.components.queues.map((q) => (
              <div key={q.name} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{q.name}</p>
                  <p className="text-xs text-slate-500">status: {q.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-700">depth: {q.depth ?? '—'}</p>
                  <p className="text-sm text-slate-700">rate: {q.processingRate ?? '—'}</p>
                </div>
              </div>
            ))}
            {health.components.queues.length === 0 && <p className="text-sm text-slate-500">No queue metrics available.</p>}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Workers</h2>
            <HealthBadge status={health.status === 'healthy' ? 'healthy' : 'degraded'} label="Instrument" />
          </div>
          {health.components.workersNote && <p className="text-sm text-slate-600 mb-3">{health.components.workersNote}</p>}
          <div className="space-y-2">
            {health.components.workers.map((w) => (
              <div key={w.name} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">{w.name}</p>
                  <p className="text-xs text-slate-500">status: {w.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-700">jobs: {w.jobsCompleted ?? '—'}</p>
                </div>
              </div>
            ))}
            {health.components.workers.length === 0 && <p className="text-sm text-slate-500">No worker metrics available.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
