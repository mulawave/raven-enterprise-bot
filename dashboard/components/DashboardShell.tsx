'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
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
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {/* Beginners checklist — shown on overview until all steps done */}
            {pathname === '/overview' && (
              <div className="mb-6">
                <OnboardingChecklist />
              </div>
            )}
            {children}
          </main>
        </div>
      </div>

      {/* First-time dashboard tour overlay */}
      {showTour && <DashboardTour onDismiss={() => setShowTour(false)} />}
    </TenantProvider>
  )
}
