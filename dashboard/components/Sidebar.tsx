'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTenantContext } from '@/lib/tenant-context'

const navigation = [
  { name: 'Overview', href: '/', icon: '📊' },
  { name: 'Conversations', href: '/conversations', icon: '💬' },
  { name: 'Orders', href: '/orders', icon: '🛒' },
  { name: 'Bookings', href: '/bookings', icon: '🏨' },
  { name: 'Payments', href: '/payments', icon: '💳' },
  { name: 'Subscription', href: '/subscription', icon: '📦' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
]

export default function Sidebar() {
  const { branding, tenant } = useTenantContext()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null)

  // Append tenant ID to /uploads/ URLs so the gated static middleware allows the request
  const logoSrc = branding?.logoUrl
    ? branding.logoUrl.startsWith('/uploads/')
      ? `${branding.logoUrl}?t=${tenant?.id ?? ''}`
      : branding.logoUrl
    : null

  const handleNavClick = (href: string) => {
    setLoadingRoute(href)
    // Clear loading state after navigation starts
    setTimeout(() => setLoadingRoute(null), 2000)
  }

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center gap-3 px-6">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={branding?.businessName || 'Tenant logo'}
            className="h-8 w-8 rounded object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-600 text-sm font-semibold text-white">
            {branding?.businessName?.charAt(0)?.toUpperCase() || 'R'}
          </div>
        )}
        <h1 className="text-xl font-bold text-white">
          {branding?.businessName || 'Raven Dashboard'}
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const isLoading = loadingRoute === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              } ${isLoading ? 'opacity-75' : ''}`}
            >
              <div className="flex items-center">
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </div>
              {isLoading && (
                <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-white"></div>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-gray-800 p-4">
        <div className="text-xs text-gray-500">
          Raven Enterprise Bot v1.0
        </div>
      </div>
    </div>
  )
}
