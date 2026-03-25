'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import AdminSidebar from '@/components/AdminSidebar'
import AdminHeader from '@/components/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const authed = isAuthenticated()
    setIsAuthed(authed)

    if (!authed && pathname !== ROUTES.LOGIN) {
      router.replace(ROUTES.LOGIN)
    }

    if (authed && pathname === ROUTES.LOGIN) {
      router.replace(ROUTES.OVERVIEW)
    }
  }, [pathname, router])

  if (!isMounted) {
    return null
  }

  if (pathname === ROUTES.LOGIN) {
    return <>{children}</>
  }

  if (!isAuthed) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 transition-colors">
      <AdminSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMobileMenuToggle={() => setMobileNavOpen(v => !v)} />
        <main className="flex-1">
          <div className="p-4 lg:p-8 pb-20 lg:pb-8 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-lg shadow-slate-200/50 dark:shadow-black/30 lg:hidden">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {[
            { label: 'Overview', href: ROUTES.OVERVIEW, icon: '📊' },
            { label: 'Tenants', href: ROUTES.TENANTS, icon: '🏢' },
            { label: 'Alerts', href: ROUTES.NOTIFICATIONS, icon: '🔔' },
            { label: 'Settings', href: ROUTES.SETTINGS, icon: '⚙️' },
            { label: 'Profile', href: ROUTES.PROFILE, icon: '👤' },
          ].map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0 ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
