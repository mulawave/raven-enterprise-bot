'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import TenantProvider from '@/components/TenantProvider'

const PUBLIC_ROUTES = ['/', '/privacy', '/terms', '/guide']

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const auth = isAuthenticated()
    setAuthed(auth)

    // Authenticated users visiting the public landing are sent to the dashboard
    if (auth && pathname === '/') {
      router.replace('/overview')
      return
    }

    // Unauthenticated users visiting protected routes go to login
    if (!auth && pathname !== '/login' && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/login')
    }

    // Already logged-in users don't need the login page
    if (auth && pathname === '/login') {
      router.replace('/overview')
    }
  }, [mounted, pathname, router])

  if (!mounted) return null

  // Public routes and login render standalone — no sidebar, no header
  if (pathname === '/login' || PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  // Protected route — wait for auth confirmation
  if (!authed) return null

  return (
    <TenantProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  )
}
