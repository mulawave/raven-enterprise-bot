'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ROUTES, API_BASE_URL } from '@/lib/constants'
import { useState, useEffect } from 'react'

const navItems = [
  { label: 'Overview', href: ROUTES.OVERVIEW, icon: '📊', description: 'Dashboard overview' },
  { label: 'Tenants', href: ROUTES.TENANTS, icon: '🏢', description: 'Manage tenants' },
  { label: 'Subscriptions', href: ROUTES.SUBSCRIPTIONS, icon: '📋', description: 'Active subscriptions' },
  { label: 'Plans', href: ROUTES.PLANS, icon: '💎', description: 'Pricing plans' },
  { label: 'Billing', href: ROUTES.BILLING, icon: '💳', description: 'Revenue & payments' },
  { label: 'Ops', href: ROUTES.OPS, icon: '⚙️', description: 'Operations center' },
  { label: 'Orders', href: ROUTES.ORDERS, icon: '📦', description: 'Order management' },
  { label: 'Customers', href: ROUTES.CUSTOMERS, icon: '👤', description: 'Customer directory' },
  { label: 'Bookings', href: ROUTES.BOOKINGS, icon: '📅', description: 'Booking analytics' },
  { label: 'Notifications', href: ROUTES.NOTIFICATIONS, icon: '🔔', description: 'Push & email broadcasts' },
  { label: 'System Health', href: ROUTES.SYSTEM, icon: '🏥', description: 'System status' },
  { label: 'Admin Users', href: ROUTES.USERS, icon: '👥', description: 'User management' },
  { label: 'Platform Reset', href: ROUTES.RESET, icon: '🔄', description: 'Reset all tenant data' },
]

const bottomNavItems = [
  { label: 'API Keys', href: ROUTES.API_KEYS, icon: '🔑', description: 'Integration keys & config' },
  { label: 'Payment', href: ROUTES.PAYMENT_CONFIG, icon: '💰', description: 'Paystack sandbox & live keys' },
  { label: 'Email', href: ROUTES.EMAIL_CONFIG, icon: '📧', description: 'SMTP & email templates' },
  { label: 'Profile', href: ROUTES.PROFILE, icon: '👤', description: 'Your profile' },
  { label: 'Settings', href: ROUTES.SETTINGS, icon: '⚙️', description: 'Configuration' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Fetch platform logo from branding API
  useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/config/branding`)
        if (!res.ok) return
        const data = await res.json()
        if (data.logo_url) {
          setLogoUrl(
            data.logo_url.startsWith('http')
              ? data.logo_url
              : `${API_BASE_URL}${data.logo_url}`,
          )
        }
      } catch {
        // non-critical
      }
    }
    fetchBranding()
  }, [])

  // Clear the loading indicator once the route has actually changed
  useEffect(() => {
    setLoadingRoute(null)
  }, [pathname])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === href || loadingRoute !== null) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    setLoadingRoute(href)
    router.push(href)
  }

  return (
    <div
      className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white h-screen sticky top-0 transition-all duration-300 ease-in-out border-r border-slate-700/50 backdrop-blur-xl flex flex-col shrink-0 z-20`}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      ></div>

      <div className="p-6 border-b border-slate-700/50 relative">
        <div className="flex items-start justify-between gap-3">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Raven Admin</h1>
                <p className="text-xs text-slate-400 font-medium">Control Plane</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            className="shrink-0 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <nav className="p-3 space-y-0.5 flex-1 pb-28 overflow-y-auto relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== ROUTES.OVERVIEW && pathname?.startsWith(item.href + '/'))
          const isLoading = loadingRoute === item.href

          const spinnerSvg = (
            <svg className="animate-spin h-4 w-4 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`
                group flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 rounded-lg transition-all duration-200 relative overflow-hidden
                ${isActive ? 'bg-blue-600/90 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}
                ${isLoading ? 'cursor-wait' : ''}
                ${loadingRoute !== null && !isLoading ? 'pointer-events-none opacity-60' : ''}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              {isCollapsed
                ? (isLoading ? spinnerSvg : <span className="text-base relative z-10">{item.icon}</span>)
                : <span className="text-base relative z-10">{item.icon}</span>
              }
              {!isCollapsed && (
                <div className="flex-1 relative z-10">
                  <span className="text-sm font-medium block leading-tight">{item.label}</span>
                  <span className={`text-[11px] leading-tight ${isActive ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-400'}`}>{item.description}</span>
                </div>
              )}
              {!isCollapsed && isLoading && spinnerSvg}
              {!isCollapsed && isActive && !isLoading && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse relative z-10"></div>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-700/50 bg-slate-900/80 backdrop-blur-sm relative">
        <nav className="p-3 space-y-0.5">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            const isLoading = loadingRoute === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`
                  group flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 rounded-lg transition-all duration-200 relative overflow-hidden
                  ${isActive ? 'bg-blue-600/90 text-white' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'}
                  ${isLoading ? 'cursor-wait' : ''}
                  ${loadingRoute !== null && !isLoading ? 'pointer-events-none opacity-60' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {isCollapsed
                  ? (isLoading
                      ? <svg className="animate-spin h-4 w-4 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      : <span className="text-base relative z-10">{item.icon}</span>)
                  : <span className="text-base relative z-10">{item.icon}</span>
                }
                {!isCollapsed && (
                  <div className="flex-1 relative z-10">
                    <span className="text-sm font-medium block leading-tight">{item.label}</span>
                    <span className={`text-[11px] leading-tight ${isActive ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-400'}`}>{item.description}</span>
                  </div>
                )}
                {!isCollapsed && isLoading && (
                  <svg className="animate-spin h-4 w-4 text-white relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </Link>
            )
          })}
        </nav>

        {!isCollapsed && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
