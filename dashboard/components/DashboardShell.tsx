'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import TenantProvider from '@/components/TenantProvider'

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

    if (!auth && pathname !== '/login') {
      router.replace('/login')
    }

    if (auth && pathname === '/login') {
      router.replace('/')
    }
  }, [mounted, pathname, router])

  // Prevent flash of content before hydration
  if (!mounted) return null

  // Login page renders completely standalone — no sidebar, no header, no TenantProvider
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Not yet confirmed as authenticated — show nothing while redirect is in-flight
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
