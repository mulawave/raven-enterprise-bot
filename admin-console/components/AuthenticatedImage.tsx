'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getAdminToken } from '@/lib/auth'

interface AuthenticatedImageProps {
  src: string
  alt: string
  className?: string
  onError?: () => void
}

export default function AuthenticatedImage({ src, alt, className, onError }: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    let objectUrl: string | null = null

    const load = async () => {
      const token = getAdminToken()
      if (!token) {
        onError?.()
        return
      }

      try {
        const response = await fetch(src, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load image')
        }

        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        if (isActive) {
          setBlobUrl(objectUrl)
        }
      } catch {
        if (isActive) {
          setBlobUrl(null)
        }
        onError?.()
      }
    }

    void load()

    return () => {
      isActive = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [onError, src])

  if (!blobUrl) return null

  return <Image src={blobUrl} alt={alt} width={512} height={512} unoptimized className={className} />
}