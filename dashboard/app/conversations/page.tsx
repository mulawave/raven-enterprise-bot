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

  useEffect(() => {
    let isActive = true

    const loadConversations = async () => {
      try {
        const data = await api<Conversation[]>(`/api/messaging/conversations?tenantId=${tenant.id}`)
        if (isActive) {
          setConversations(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        if (isActive) {
          setConversations([])
        }
      }
    }

    loadConversations()

    return () => {
      isActive = false
    }
  }, [tenant.id])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Conversations</h1>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No conversations yet</p>
          <p className="text-sm text-gray-400 mt-2">Conversations will appear here when customers message your bot</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
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
                      conv.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {conv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
