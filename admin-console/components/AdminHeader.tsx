'use client'

import { useRouter, usePathname } from 'next/navigation'
import { clearAdminToken } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

interface AdminNotification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  created_at: string
}

const NOTIF_TYPE_ICONS: Record<string, string> = {
  broadcast: '📢', alert: '⚠️', new_tenant: '🎉',
  payment: '💳', order_new: '🛒', order_status: '📦', escalation: '🔴',
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString()
}

// Register FCM token for admin push notifications
async function registerAdminFcmToken() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  try {
    // Fetch Firebase client config from the DB (via public config endpoint — no auth required)
    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4010'
      : 'https://api.raven-ai.online'
    const res = await fetch(`${apiBase}/api/config/public`)
    if (!res.ok) return
    const data = await res.json()
    const firebaseConfig = {
      apiKey:            data.FCM_CLIENT_API_KEY            ?? '',
      authDomain:        data.FCM_CLIENT_AUTH_DOMAIN        ?? '',
      projectId:         data.FCM_CLIENT_PROJECT_ID         ?? '',
      messagingSenderId: data.FCM_CLIENT_MESSAGING_SENDER_ID ?? '',
      appId:             data.FCM_CLIENT_APP_ID             ?? '',
    }
    const vapidKey: string = data.FCM_CLIENT_VAPID_KEY ?? ''
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return

    // Lazy-load firebase to avoid build errors when not installed yet
    const { initializeApp, getApps, getApp } = await import('firebase/app').catch(() => ({ initializeApp: null, getApps: null, getApp: null }))
    const { getMessaging, getToken } = await import('firebase/messaging').catch(() => ({ getMessaging: null, getToken: null }))
    if (!initializeApp || !getApps || !getApp || !getMessaging || !getToken) return

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)
    const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    // Send DB-derived config to the service worker
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })
    })

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: sw })
    if (!token) return
    await api.post('/admin/notifications/token', { token, platform: 'web' }).catch(() => undefined)
  } catch { /* non-critical */ }
}

export default function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [showDropdown, setShowDropdown] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const tokenRegistered = useRef(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (tokenRegistered.current) return
    tokenRegistered.current = true
    registerAdminFcmToken()
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get<{ items: AdminNotification[]; unreadCount: number }>('/admin/notifications?limit=15')
      setNotifications(data.items ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleMarkAllRead() {
    setIsMarkingRead(true)
    try {
      await api.patch('/admin/notifications/read-all', {})
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch { /* non-critical */ } finally {
      setIsMarkingRead(false)
    }
  }

  const handleLogout = () => {
    clearAdminToken()
    router.push(ROUTES.LOGIN)
  }

  const getCurrentPage = () => {
    const path = pathname?.split('/').pop() || 'overview'
    return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ')
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-10 shadow-sm w-full">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {getCurrentPage()}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {now
                ? now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Loading date...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-600">Live</span>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-slate-600">
                {now ? now.toLocaleTimeString() : '--:--:--'}
              </span>
            </div>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowDropdown(false) }}
              className="relative flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                    {unreadCount > 0 && <p className="text-xs text-slate-500">{unreadCount} unread</p>}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={isMarkingRead}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMarkingRead ? 'Marking…' : 'Mark all read'}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">No notifications yet</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? 'border-l-2 border-l-blue-500 bg-blue-50/30' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-base flex-shrink-0 leading-none mt-0.5">{NOTIF_TYPE_ICONS[n.type] ?? '🔔'}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${!n.read ? 'text-blue-900' : 'text-slate-900'}`}>{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                            <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50">
                  <a href="/admin/notifications" className="text-xs text-blue-600 font-semibold hover:text-blue-700">
                    View all broadcasts →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Admin Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => { setShowDropdown(!showDropdown); setShowNotifs(false) }}
              className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
            >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm backdrop-blur-sm">
                SA
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold">SUPER ADMIN</div>
                <div className="text-xs opacity-90">admin@raven.ai</div>
              </div>
              <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                      SA
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Super Admin</div>
                      <div className="text-xs text-slate-600">admin@raven.ai</div>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-semibold">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
