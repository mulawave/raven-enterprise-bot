'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import HealthBadge from '@/components/HealthBadge'

interface MessagingStatsApiResponse {
  total_messages?: number
  messages_24h?: number
  total_conversations?: number
  active_conversations_24h?: number
}

interface AIHealthApiResponse {
  status?: 'active' | 'idle'
  total_ai_interactions?: number
  interactions_last_hour?: number
  note?: string
}

interface QueueDetail {
  status: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

interface QueueHealthApiResponse {
  status?: string
  queues?: {
    'ai-messages'?: QueueDetail
    'outbound-messages'?: QueueDetail
    [key: string]: QueueDetail | undefined
  }
}

interface MessagingViewModel {
  sent24h: number
  activeConversations24h: number
  totalMessages: number
  totalConversations: number
}

interface AIViewModel {
  status: 'healthy' | 'degraded' | 'down'
  engineStatus: 'active' | 'idle'
  interactionsLastHour: number
  totalInteractions: number
  note?: string
}

interface QueueViewModel {
  overallStatus: 'healthy' | 'degraded'
  queues: Array<{
    name: string
    status: string
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }>
}

function Shimmer({ className }: { className?: string }) {
  return <div className={`bg-slate-700 rounded animate-pulse ${className ?? ''}`} />
}

export default function OpsPage() {
  const [messaging, setMessaging] = useState<MessagingViewModel | null>(null)
  const [ai, setAi] = useState<AIViewModel | null>(null)
  const [queues, setQueues] = useState<QueueViewModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      setIsLoading(true)
      const [messagingData, aiData, queuesData] = await Promise.all([
        api.get<MessagingStatsApiResponse>(API_ENDPOINTS.OPS_MESSAGING_STATS),
        api.get<AIHealthApiResponse>(API_ENDPOINTS.OPS_AI_HEALTH),
        api.get<QueueHealthApiResponse>(API_ENDPOINTS.OPS_QUEUES_HEALTH),
      ])

      setMessaging({
        sent24h: Number(messagingData?.messages_24h ?? 0),
        activeConversations24h: Number(messagingData?.active_conversations_24h ?? 0),
        totalMessages: Number(messagingData?.total_messages ?? 0),
        totalConversations: Number(messagingData?.total_conversations ?? 0),
      })

      const engineStatus = aiData?.status ?? 'idle'
      setAi({
        // idle is not degraded — it just means no messages processed recently
        status: 'healthy',
        engineStatus,
        interactionsLastHour: Number(aiData?.interactions_last_hour ?? 0),
        totalInteractions: Number(aiData?.total_ai_interactions ?? 0),
        note: aiData?.note,
      })

      const queueEntries = Object.entries(queuesData?.queues ?? {}).map(([name, detail]) => ({
        name,
        status: detail?.status ?? 'unknown',
        waiting: detail?.waiting ?? 0,
        active: detail?.active ?? 0,
        completed: detail?.completed ?? 0,
        failed: detail?.failed ?? 0,
        delayed: detail?.delayed ?? 0,
      }))

      setQueues({
        overallStatus: queueEntries.some((q) => q.status === 'degraded') ? 'degraded' : 'healthy',
        queues: queueEntries,
      })

      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load ops data')
    } finally {
      setIsLoading(false)
    }
  }

  const shimmerCard = (
    <div className="space-y-3">
      <Shimmer className="h-5 w-36" />
      <div className="grid grid-cols-4 gap-4 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Shimmer className="h-3 w-24 mb-2" />
            <Shimmer className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Operations Monitoring</h1>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm text-slate-200 rounded-lg transition-colors"
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && !messaging && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Messaging */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">Messaging Service</h2>
          {isLoading || !messaging
            ? <Shimmer className="h-6 w-16 rounded-full" />
            : <HealthBadge status={messaging.sent24h > 0 || messaging.totalMessages > 0 ? 'healthy' : 'healthy'} />}
        </div>
        {isLoading || !messaging
          ? shimmerCard
          : <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Sent (24h)', value: messaging.sent24h.toLocaleString(), color: 'text-white' },
                { label: 'Active Conversations (24h)', value: messaging.activeConversations24h.toLocaleString(), color: 'text-blue-400' },
                { label: 'Total Messages', value: messaging.totalMessages.toLocaleString(), color: 'text-white' },
                { label: 'Total Conversations', value: messaging.totalConversations.toLocaleString(), color: 'text-white' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-sm text-slate-400">{label}</p>
                  <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
                </div>
              ))}
            </div>
        }
      </div>

      {/* AI Engine */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">AI Engine</h2>
          {isLoading || !ai
            ? <Shimmer className="h-6 w-16 rounded-full" />
            : <HealthBadge status={ai.status} />}
        </div>
        {isLoading || !ai
          ? shimmerCard
          : <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-slate-400">Engine Status</p>
                  <p className={`text-2xl font-bold mt-1 capitalize ${ai.engineStatus === 'active' ? 'text-green-400' : 'text-slate-300'}`}>
                    {ai.engineStatus}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Interactions (Last Hour)</p>
                  <p className="text-2xl font-bold text-white mt-1">{ai.interactionsLastHour.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Interactions</p>
                  <p className="text-2xl font-bold text-white mt-1">{ai.totalInteractions.toLocaleString()}</p>
                </div>
              </div>
              {ai.note && <p className="mt-4 text-sm text-slate-400">{ai.note}</p>}
            </>
        }
      </div>

      {/* Queue System */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">Queue System</h2>
          {isLoading || !queues
            ? <Shimmer className="h-6 w-16 rounded-full" />
            : <HealthBadge status={queues.overallStatus} />}
        </div>
        {isLoading || !queues
          ? <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Shimmer key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          : queues.queues.length === 0
            ? <p className="text-sm text-slate-400">No queue data available.</p>
            : <div className="space-y-3">
                {queues.queues.map((q) => (
                  <div key={q.name} className="bg-slate-700/50 border border-slate-600 rounded-xl px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-white">{q.name}</p>
                      <HealthBadge status={q.status === 'healthy' ? 'healthy' : 'degraded'} />
                    </div>
                    <div className="grid grid-cols-5 gap-3 text-center">
                      {[
                        { label: 'Waiting', value: q.waiting, color: 'text-yellow-400' },
                        { label: 'Active', value: q.active, color: 'text-blue-400' },
                        { label: 'Completed', value: q.completed, color: 'text-green-400' },
                        { label: 'Failed', value: q.failed, color: q.failed > 0 ? 'text-red-400' : 'text-slate-400' },
                        { label: 'Delayed', value: q.delayed, color: 'text-slate-300' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-slate-800/50 rounded-lg px-2 py-2">
                          <p className="text-xs text-slate-400">{label}</p>
                          <p className={`text-lg font-bold ${color}`}>{value.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </div>
  )
}
