'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import TenantProvider from '@/components/TenantProvider'
import DashboardTour, { TOUR_SEEN_KEY } from '@/components/DashboardTour'
import OnboardingChecklist from '@/components/OnboardingChecklist'

// Standalone pages that render without the shell chrome
const STANDALONE_ROUTES = [
  '/',
  '/login',
  '/register',
  '/register/check-email',
  '/confirm-email',
  '/onboarding',
  '/privacy',
  '/terms',
  '/guide',
  '/data-deletion',
  // Public payment callback — customers land here from Paystack redirect; no auth required
  '/payment',
]

function isStandalone(pathname: string) {
  return STANDALONE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const auth = isAuthenticated()
    setAuthed(auth)

    // Authenticated users on the landing go straight to the dashboard
    if (auth && pathname === '/') {
      router.replace('/overview')
      return
    }

    // Unauthenticated users on protected routes go to login
    if (!auth && !isStandalone(pathname)) {
      router.replace('/login')
      return
    }

    // Enforce onboarding gate — no dashboard access until onboarding is complete
    if (auth && !isStandalone(pathname)) {
      const session = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('session') ?? '{}') : {}
      if (session.onboardingCompleted === false) {
        router.replace('/onboarding')
        return
      }
    }

    // Already logged-in users don't need the login or register page
    if (auth && (pathname === '/login' || pathname === '/register')) {
      router.replace('/overview')
      return
    }

    // Show tour on first /overview visit
    if (auth && pathname === '/overview') {
      const seen = localStorage.getItem(TOUR_SEEN_KEY)
      if (!seen) setShowTour(true)
    }
  }, [mounted, pathname, router])

  if (!mounted) return null

  // Standalone pages render without shell chrome
  if (isStandalone(pathname)) {
    return <>{children}</>
  }

  // Protected route — wait for auth confirmation before rendering shell
  if (!authed) return null

  return (
    <TenantProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMobileMenuToggle={() => setMobileNavOpen(v => !v)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
            {/* Beginners checklist — shown on overview until all steps done */}
            {pathname === '/overview' && (
              <div className="mb-6">
                <OnboardingChecklist />
              </div>
            )}
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-xl shadow-lg shadow-gray-200/50 lg:hidden">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {[
              { label: 'Home', href: '/overview', icon: '\ud83d\udcca' },
              { label: 'Chats', href: '/conversations', icon: '\ud83d\udcac' },
              { label: 'Orders', href: '/orders', icon: '\ud83d\udce6' },
              { label: 'Payments', href: '/payments', icon: '\ud83d\udcb3' },
              { label: 'Settings', href: '/settings', icon: '\u2699\ufe0f' },
            ].map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0 ${
                    isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* First-time dashboard tour overlay */}
      {showTour && <DashboardTour onDismiss={() => setShowTour(false)} />}
    </TenantProvider>
  )
}
