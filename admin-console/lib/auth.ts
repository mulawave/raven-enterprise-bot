import { ADMIN_TOKEN_KEY } from './constants'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie ? document.cookie.split('; ') : []
  for (const cookie of cookies) {
    const idx = cookie.indexOf('=')
    const key = idx >= 0 ? cookie.slice(0, idx) : cookie
    if (key === name) {
      const value = idx >= 0 ? cookie.slice(idx + 1) : ''
      return decodeURIComponent(value)
    }
  }
  return null
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  const fromStorage = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (fromStorage) return fromStorage

  const fromCookie = readCookie(ADMIN_TOKEN_KEY)
  if (fromCookie) {
    // Keep client API calls working even after a hard refresh
    localStorage.setItem(ADMIN_TOKEN_KEY, fromCookie)
  }
  return fromCookie
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  // Middleware can only read cookies, not localStorage
  writeCookie(ADMIN_TOKEN_KEY, token, 60 * 60 * 24 * 7)
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  writeCookie(ADMIN_TOKEN_KEY, '', 0)
}

export function isAuthenticated(): boolean {
  return !!getAdminToken()
}
