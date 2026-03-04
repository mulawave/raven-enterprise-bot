'use client'

import { useEffect, useState } from 'react'
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1">
          <div className="p-8 max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
