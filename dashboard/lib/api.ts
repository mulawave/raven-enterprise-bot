import { API_BASE_URL } from './constants'
import { getAccessToken } from './auth'

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const accessToken = getAccessToken()

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `API error: ${response.status} ${response.statusText}`)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as unknown as T
  }

  return response.json()
}

/**
 * Multipart upload — does NOT set Content-Type so the browser sets it with
 * the correct multipart boundary. Used for file uploads to the backend.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const accessToken = getAccessToken()

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      // No Content-Type — browser sets it automatically with the multipart boundary
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error: ${response.status} ${text}`)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as unknown as T
  }

  return response.json()
}

