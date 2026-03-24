'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { getFcmToken, getFirebaseConfig, onForegroundMessage } from '@/lib/fcm'

export interface AppNotification {
  id: string
  title: string
  body: string
  type: string
  data: string | null
  read: boolean
  created_at: string
}

interface NotificationState {
  items: AppNotification[]
  unreadCount: number
  isLoading: boolean
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    items: [],
    unreadCount: 0,
    isLoading: true,
  })
  const tokenRegistered = useRef(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api<{ items: AppNotification[]; unreadCount: number }>(
        '/api/notifications?limit=20',
      )
      setState({ items: data.items, unreadCount: data.unreadCount, isLoading: false })
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const markAllRead = useCallback(async () => {
    await api('/api/notifications/read-all', { method: 'PATCH' }).catch(() => undefined)
    setState((prev) => ({
      ...prev,
      items: prev.items.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  }, [])

  const markOneRead = useCallback(async (id: string) => {
    await api(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => undefined)
    setState((prev) => ({
      ...prev,
      items: prev.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }))
  }, [])

  // Register FCM token once, then wire up the foreground listener and service worker
  useEffect(() => {
    if (tokenRegistered.current) return
    tokenRegistered.current = true

    getFcmToken().then(async (token) => {
      if (!token) return

      // Persist token in backend
      api('/api/notifications/token', {
        method: 'POST',
        body: JSON.stringify({ token, platform: 'web' }),
      }).catch(() => undefined)

      // Pass DB-derived config to the service worker (background push handler)
      const config = await getFirebaseConfig()
      if (config) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage({
            type: 'FIREBASE_CONFIG',
            config: {
              apiKey:            config.apiKey,
              authDomain:        config.authDomain,
              projectId:         config.projectId,
              messagingSenderId: config.messagingSenderId,
              appId:             config.appId,
            },
          })
        })
      }

      // Firebase is now initialised — subscribe to foreground messages
      unsubscribeRef.current = onForegroundMessage(() => fetchNotifications())
    })

    return () => { unsubscribeRef.current?.() }
  }, [fetchNotifications])

  // Initial fetch + poll every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  return { ...state, markAllRead, markOneRead, refetch: fetchNotifications }
}
