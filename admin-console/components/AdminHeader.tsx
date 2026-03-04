'use client'

import { useRouter, usePathname } from 'next/navigation'
import { clearAdminToken } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { useEffect, useState } from 'react'

export default function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [showDropdown, setShowDropdown] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = () => {
    clearAdminToken()
    router.push(ROUTES.LOGIN)
  }

  const getCurrentPage = () => {
    const path = pathname?.split('/').pop() || 'overview'
    return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ')
  }

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-10 shadow-sm w-full">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {getCurrentPage()}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {now
                ? now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Loading date...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-600">Live</span>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-slate-600">
                {now ? now.toLocaleTimeString() : '--:--:--'}
              </span>
            </div>
          </div>

          {/* Admin Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
            >
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm backdrop-blur-sm">
                SA
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold">SUPER ADMIN</div>
                <div className="text-xs opacity-90">admin@raven.ai</div>
              </div>
              <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">
                      SA
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Super Admin</div>
                      <div className="text-xs text-slate-600">admin@raven.ai</div>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-semibold">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
