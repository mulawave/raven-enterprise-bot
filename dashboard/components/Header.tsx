"use client"

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenantContext } from '@/lib/tenant-context'
import { clearSession } from '@/lib/auth'
import { useOnClickOutside } from '@/lib/use-on-click-outside'

export default function Header() {
  const { tenant, branding } = useTenantContext()
  const isSuspended = tenant?.status === 'SUSPENDED'
  const router = useRouter()

  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(menuRef, () => setMenuOpen(false))

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      clearSession()
      router.replace('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const displayName = branding?.businessName || tenant?.name || 'User'
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <>
      {isSuspended && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-sm text-red-700">
          This account is suspended. Contact support.
        </div>
      )}
      <header className="flex h-16 items-center justify-between border-b bg-white px-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        </div>
        <div className="relative flex items-center space-x-4" ref={menuRef}>
          <span className="hidden text-sm text-gray-600 sm:block">
            {displayName}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
                <p className="truncate text-xs text-gray-500 capitalize">{tenant?.status?.toLowerCase() ?? 'active'}</p>
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
      </header>
    </>
  )
}
