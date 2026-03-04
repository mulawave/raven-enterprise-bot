'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'
import HealthBadge from '@/components/HealthBadge'
import LoadingSkeleton from '@/components/LoadingSkeleton'

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

interface QueueHealthApiResponse {
  status?: string
  note?: string
  recommendation?: string
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
  status: 'healthy' | 'degraded' | 'down'
  rawStatus?: string
  note?: string
  recommendation?: string
}

export default function OpsPage() {
  const [messaging, setMessaging] = useState<MessagingViewModel | null>(null)
  const [ai, setAi] = useState<AIViewModel | null>(null)
  const [queues, setQueues] = useState<QueueViewModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [messagingData, aiData, queuesData] = await Promise.all([
          api.get<MessagingStatsApiResponse>(API_ENDPOINTS.OPS_MESSAGING_STATS),
          api.get<AIHealthApiResponse>(API_ENDPOINTS.OPS_AI_HEALTH),
          api.get<QueueHealthApiResponse>(API_ENDPOINTS.OPS_QUEUES_HEALTH),
        ])

        const normalizedMessaging: MessagingViewModel = {
          sent24h: Number(messagingData?.messages_24h ?? 0),
          activeConversations24h: Number(messagingData?.active_conversations_24h ?? 0),
          totalMessages: Number(messagingData?.total_messages ?? 0),
          totalConversations: Number(messagingData?.total_conversations ?? 0),
        }

        const engineStatus = aiData?.status ?? 'idle'
        const normalizedAi: AIViewModel = {
          status: engineStatus === 'active' ? 'healthy' : 'degraded',
          engineStatus,
          interactionsLastHour: Number(aiData?.interactions_last_hour ?? 0),
          totalInteractions: Number(aiData?.total_ai_interactions ?? 0),
          note: aiData?.note,
        }

        const rawQueueStatus = queuesData?.status
        const normalizedQueues: QueueViewModel = {
          status: rawQueueStatus === 'healthy' ? 'healthy' : 'degraded',
          rawStatus: rawQueueStatus,
          note: queuesData?.note,
          recommendation: queuesData?.recommendation,
        }

        setMessaging(normalizedMessaging)
        setAi(normalizedAi)
        setQueues(normalizedQueues)
      } catch (err: any) {
        setError(err.message || 'Failed to load ops data')
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
      <h1 className="text-3xl font-bold text-slate-900">Operations Monitoring</h1>

      {messaging && (
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Messaging Service</h2>
            <HealthBadge 
              status={messaging.sent24h > 0 ? 'healthy' : 'degraded'} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-600">Sent (24h)</p>
              <p className="text-2xl font-bold text-slate-900">{Number(messaging.sent24h ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Active Conversations (24h)</p>
              <p className="text-2xl font-bold text-blue-600">{Number(messaging.activeConversations24h ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Messages</p>
              <p className="text-2xl font-bold text-slate-900">{Number(messaging.totalMessages ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Conversations</p>
              <p className="text-2xl font-bold text-slate-900">{Number(messaging.totalConversations ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {ai && (
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">AI Engine</h2>
            <HealthBadge status={ai.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-600">Engine Status</p>
              <p className="text-2xl font-bold text-slate-900 capitalize">{ai.engineStatus}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Interactions (Last Hour)</p>
              <p className="text-2xl font-bold text-slate-900">{Number(ai.interactionsLastHour ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Interactions</p>
              <p className="text-2xl font-bold text-slate-900">{Number(ai.totalInteractions ?? 0).toLocaleString()}</p>
            </div>
          </div>

          {ai.note && (
            <p className="mt-4 text-sm text-slate-600">{ai.note}</p>
          )}
        </div>
      )}

      {queues && (
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Queue System</h2>
            <HealthBadge status={queues.status} />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Status: <span className="font-medium text-slate-900">{queues.rawStatus ?? 'unknown'}</span>
            </p>
            {queues.note && <p className="text-sm text-slate-600">{queues.note}</p>}
            {queues.recommendation && <p className="text-sm text-slate-600">{queues.recommendation}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
