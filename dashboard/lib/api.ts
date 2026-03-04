import { API_BASE_URL } from './constants'

function getTenantId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('session')
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.tenantId ?? null
  } catch {
    return null
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const tenantId = getTenantId()

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
