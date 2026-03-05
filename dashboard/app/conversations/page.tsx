"use client"

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { useTenantContext } from '@/lib/tenant-context'

interface Conversation {
  sessionId: string
  customerId: string
  customerName?: string
  messagesCount: number
  lastMessageAt: string
  status: string
}

export default function ConversationsPage() {
  const { tenant } = useTenantContext()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    setIsLoading(true)
    setError(null)

    api<Conversation[]>(`/api/messaging/conversations?tenantId=${tenant.id}`)
      .then((data) => {
        if (isActive) setConversations(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (isActive) setError('Failed to load conversations.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => { isActive = false }
  }, [tenant.id])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Conversations</h1>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Customer', 'Messages', 'Last Activity', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-200 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-8 bg-slate-200 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : conversations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No conversations yet</p>
            <p className="text-sm text-gray-400 mt-2">Conversations will appear here when customers message your bot</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversations.map((conv) => (
                <tr key={conv.sessionId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {conv.customerName || conv.customerId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {conv.messagesCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(conv.lastMessageAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      conv.status === 'open'
                        ? 'bg-green-100 text-green-800'
                        : conv.status === 'resolved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {conv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
