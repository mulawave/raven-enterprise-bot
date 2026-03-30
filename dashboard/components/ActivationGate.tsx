'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import ActivationOverlay from './ActivationOverlay'
import { API_BASE_URL } from '@/lib/constants'

/** Routes that bypass the activation gate */
const PUBLIC_ROUTES = ['/rba_sales']

export default function ActivationGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<'checking' | 'activated' | 'needs-activation'>('checking')

  const isPublic = PUBLIC_ROUTES.some(r => pathname?.startsWith(r))

  useEffect(() => {
    if (isPublic) {
      setStatus('activated')
      return
    }

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/licensing/status`)
        const data = await res.json()
        setStatus(data.activated ? 'activated' : 'needs-activation')
      } catch {
        setStatus('needs-activation')
      }
    }

    check()
  }, [isPublic])

  if (isPublic || status === 'activated') {
    return <>{children}</>
  }

  return <ActivationOverlay />
}
