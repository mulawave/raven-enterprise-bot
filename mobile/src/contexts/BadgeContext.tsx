import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../lib/api'

interface BadgeCounts {
  chats: number
  orders: number
  notifications: number
}

interface BadgeContextValue {
  badges: BadgeCounts
  refresh: () => void
}

const BadgeContext = createContext<BadgeContextValue>({
  badges: { chats: 0, orders: 0, notifications: 0 },
  refresh: () => {},
})

export function useBadges() {
  return useContext(BadgeContext)
}

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  const [badges, setBadges] = useState<BadgeCounts>({ chats: 0, orders: 0, notifications: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const refresh = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const [conversations, notifData, orders] = await Promise.all([
        api<any[]>('/api/messaging/conversations').catch(() => []),
        api<{ unreadCount?: number }>('/api/notifications?limit=1').catch(() => ({ unreadCount: 0 })),
        api<any[]>('/api/ordering/orders').catch(() => []),
      ])

      const unreadChats = Array.isArray(conversations)
        ? conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
        : 0

      const escalatedChats = Array.isArray(conversations)
        ? conversations.filter((c) => c.status === 'escalated').length
        : 0

      const pendingOrders = Array.isArray(orders)
        ? orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length
        : 0

      setBadges({
        chats: unreadChats + escalatedChats,
        orders: pendingOrders,
        notifications: (notifData as any)?.unreadCount ?? 0,
      })
    } catch {
      // silently ignore
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) {
      setBadges({ chats: 0, orders: 0, notifications: 0 })
      return
    }

    refresh()
    intervalRef.current = setInterval(refresh, 15_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isLoggedIn, refresh])

  return (
    <BadgeContext.Provider value={{ badges, refresh }}>
      {children}
    </BadgeContext.Provider>
  )
}
