"use client"

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantContext } from '@/lib/tenant-context'
import { clearSession } from '@/lib/auth'
import { useOnClickOutside } from '@/lib/use-on-click-outside'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'
import { useNotifications } from '@/lib/use-notifications'
import { useTheme } from '@/lib/theme-context'
import type { AppNotification } from '@/lib/use-notifications'

// ── Notification type → colour map ────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  escalation: 'text-red-500',
  order_new: 'text-blue-500',
  order_status: 'text-amber-500',
  payment: 'text-emerald-500',
  new_tenant: 'text-purple-500',
  alert: 'text-orange-500',
  broadcast: 'text-sky-500',
}

const TYPE_ICONS: Record<string, string> = {
  escalation: '🔴',
  order_new: '🛒',
  order_status: '📦',
  payment: '💳',
  new_tenant: '🎉',
  alert: '⚠️',
  broadcast: '📢',
}

function NotificationItem({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const icon = TYPE_ICONS[n.type] ?? '🔔'
  const color = TYPE_COLORS[n.type] ?? 'text-gray-500'
  const time = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <button
      type="button"
      onClick={() => !n.read && onRead(n.id)}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex gap-3 items-start transition-colors ${n.read ? 'opacity-60' : 'bg-blue-50/40'}`}
    >
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${color}`}>{n.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
      {!n.read && (
        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  )
}

export default function Header({ onMobileMenuToggle }: { onMobileMenuToggle: () => void }) {
  const { tenant, branding } = useTenantContext()
  const isSuspended = tenant?.status === 'SUSPENDED'
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const { items, unreadCount, isLoading, markAllRead, markOneRead } = useNotifications()

  useOnClickOutside(menuRef, () => setMenuOpen(false))
  useOnClickOutside(notifRef, () => setNotifOpen(false))

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
      clearSession()
      router.replace('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayName = branding?.businessName || tenant?.name || 'User'
  const initials = displayName.charAt(0).toUpperCase()
  const rawLogo = branding?.logoUrl || null
  const logoSrc = rawLogo ? (rawLogo.startsWith('http') ? rawLogo : `${API_BASE_URL}${rawLogo}`) : null

  return (
    <>
      {isSuspended && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700">
          This account is suspended. Contact support.
        </div>
      )}
      <header className="flex h-16 items-center justify-between border-b bg-white dark:bg-slate-800 dark:border-slate-700 px-4 lg:px-6 transition-colors">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Dashboard</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Theme Toggle ────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* ── Notification Bell ───────────────────────────────────────── */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => { setNotifOpen((p) => !p); setMenuOpen(false) }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="fixed inset-x-2 top-16 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 w-auto sm:w-96 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100">
                      <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-4 py-3 flex gap-3">
                        <div className="h-5 w-5 rounded animate-pulse bg-gray-200 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                        </div>
                      </div>
                    ))
                  ) : items.length ? (
                    items.map((n) => <NotificationItem key={n.id} n={n} onRead={markOneRead} />)
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-400">No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── User menu ───────────────────────────────────────────────── */}
          <div className="relative" ref={menuRef}>
            <div className="flex items-center space-x-2">
              <span className="hidden text-sm text-gray-600 dark:text-slate-400 sm:block">
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => { setMenuOpen((prev) => !prev); setNotifOpen(false) }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 overflow-hidden"
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                {logoSrc ? (
                  <img src={logoSrc} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  initials
                )}
              </button>
            </div>

            {menuOpen && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg">
                <div className="border-b border-gray-100 dark:border-slate-700 px-4 py-2">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">{displayName}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-slate-400 capitalize">{tenant?.status?.toLowerCase() ?? 'active'}</p>
                </div>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      Logging out…
                    </>
                  ) : (
                    <>
                      <span>↩</span>
                      Log out
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
