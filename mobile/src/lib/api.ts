// ─── Authenticated API Client ───────────────────────────────────────────────
// Never applies request timeouts — users are on slow 2G/3G networks.

import { API_BASE_URL } from '../constants/config'
import { getToken, clearAuth } from './auth'

interface ApiOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

class ApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const token = await getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  // Handle 401 — token expired
  if (res.status === 401) {
    await clearAuth()
    throw new ApiError('Session expired', 401)
  }

  if (!res.ok) {
    let data: unknown
    try {
      data = await res.json()
    } catch {
      data = null
    }
    throw new ApiError(
      (data as { message?: string })?.message || `Request failed (${res.status})`,
      res.status,
      data,
    )
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T

  return res.json()
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getToken()

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401) {
    await clearAuth()
    throw new ApiError('Session expired', 401)
  }

  if (!res.ok) {
    let data: unknown
    try { data = await res.json() } catch { data = null }
    throw new ApiError(
      (data as { message?: string })?.message || `Upload failed (${res.status})`,
      res.status,
      data,
    )
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export { ApiError }
