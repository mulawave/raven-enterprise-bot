'use client'

import { useState, useEffect } from 'react'
import ActivationOverlay from './ActivationOverlay'
import { API_BASE_URL } from '@/lib/constants'

export default function ActivationGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'activated' | 'needs-activation'>('checking')

  useEffect(() => {
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
  }, [])

  if (status === 'activated') {
    return <>{children}</>
  }

  return <ActivationOverlay />
}
