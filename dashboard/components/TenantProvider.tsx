'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TenantContext, TenantContextValue } from '@/lib/tenant-context'
import { API_BASE_URL } from '@/lib/constants'
import { getAccessToken, clearSession } from '@/lib/auth'
import LoadingSpinner from '@/components/LoadingSpinner'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return null
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

function adjustColor({ r, g, b }: { r: number; g: number; b: number }, amount: number) {
  return {
    r: clamp(r + amount, 0, 255),
    g: clamp(g + amount, 0, 255),
    b: clamp(b + amount, 0, 255),
  }
}

export default function TenantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [contextValue, setContextValue] = useState<TenantContextValue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const loadTenantContext = async () => {
      try {
        setLoading(true)
        setError(null)

        const accessToken = getAccessToken()

        if (!accessToken) {
          throw new Error('Missing session token')
        }

        const response = await fetch(`${API_BASE_URL}/tenant/context`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid — clear stale session and send to login
            clearSession()
            router.replace('/login')
            return
          }
          throw new Error(`Failed to fetch tenant context (${response.status})`)
        }

        const raw = (await response.json()) as TenantContextValue

        // Normalise so downstream components never receive undefined sub-objects
        const data: TenantContextValue = {
          ...raw,
          tenant: {
            id: raw.tenant?.id ?? '',
            name: raw.tenant?.name ?? '',
            status: raw.tenant?.status ?? 'ACTIVE',
          },
          subscription: {
            plan: raw.subscription?.plan ?? 'starter',
            status: raw.subscription?.status ?? 'active',
            conversations_used: raw.subscription?.conversations_used ?? 0,
            conversations_limit: raw.subscription?.conversations_limit ?? 1000,
            current_period_start: raw.subscription?.current_period_start,
            current_period_end: raw.subscription?.current_period_end,
          },
          branding: {
            businessName: raw.branding?.businessName ?? '',
            logoUrl: raw.branding?.logoUrl ?? '',
            primaryColor: raw.branding?.primaryColor ?? '#2563eb',
            whatsappNumber: raw.branding?.whatsappNumber ?? '',
          },
          features: {
            ordering: raw.features?.ordering ?? false,
            bookings: raw.features?.bookings ?? false,
            payments: raw.features?.payments ?? false,
            messaging: raw.features?.messaging ?? false,
          },
        }

        if (isActive) {
          setContextValue(data)
          setLoading(false)
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to fetch tenant context')
          setLoading(false)
        }
      }
    }

    loadTenantContext()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!contextValue) return
    const primary = contextValue.branding.primaryColor
    const rgb = primary ? hexToRgb(primary) : null
    if (!rgb || typeof document === 'undefined') return

    const root = document.documentElement
    const light = adjustColor(rgb, 40)
    const lighter = adjustColor(rgb, 80)
    const dark = adjustColor(rgb, -30)
    const darker = adjustColor(rgb, -60)

    root.style.setProperty('--primary-50', `${lighter.r} ${lighter.g} ${lighter.b}`)
    root.style.setProperty('--primary-100', `${light.r} ${light.g} ${light.b}`)
    root.style.setProperty('--primary-500', `${rgb.r} ${rgb.g} ${rgb.b}`)
    root.style.setProperty('--primary-600', `${dark.r} ${dark.g} ${dark.b}`)
    root.style.setProperty('--primary-700', `${darker.r} ${darker.g} ${darker.b}`)
  }, [contextValue])

  const value = useMemo(() => contextValue, [contextValue])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-500">Loading tenant context...</p>
        </div>
      </div>
    )
  }

  if (error || !value) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-6">
        <div className="max-w-lg rounded-lg border border-red-200 bg-white p-6 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Unable to load tenant context</h1>
          <p className="mt-2 text-sm text-gray-600">
            {error || 'The dashboard could not initialize. Please check the backend and tenant configuration.'}
          </p>
          <p className="mt-4 text-xs text-gray-500">
            Ensure the API is running and the tenant exists in the database.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
