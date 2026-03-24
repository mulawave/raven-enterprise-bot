'use client'

import { useEffect } from 'react'
import { API_BASE_URL } from '@/lib/constants'

// Module-level cache so the favicon survives component re-mounts
let _cachedFaviconHref: string | null = null

function applyFavicon(href: string) {
  // Check if an existing favicon link already points to this URL
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (existing && existing.href === href) return

  // Remove ALL existing icon links so browsers don't pick a stale one
  document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  ).forEach((el) => el.remove())

  const link = document.createElement('link')
  link.rel = 'icon'
  link.href = href
  if (href.endsWith('.svg')) link.type = 'image/svg+xml'
  else if (href.endsWith('.png')) link.type = 'image/png'
  else if (href.endsWith('.ico')) link.type = 'image/x-icon'
  document.head.appendChild(link)
}

async function fetchAndApplyFavicon() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/config/branding`)
    if (!res.ok) return
    const data = await res.json()
    if (data.favicon_url) {
      _cachedFaviconHref = data.favicon_url.startsWith('http')
        ? data.favicon_url
        : `${API_BASE_URL}${data.favicon_url}`
      applyFavicon(_cachedFaviconHref!)
    }
  } catch {
    // non-critical
  }
}

export default function DynamicFavicon() {
  useEffect(() => {
    // If we already have a cached favicon URL, apply it immediately
    if (_cachedFaviconHref) {
      applyFavicon(_cachedFaviconHref)
    }
    // Always fetch fresh (updates cache for next mount + picks up admin changes)
    fetchAndApplyFavicon()
  }, [])

  return null
}
