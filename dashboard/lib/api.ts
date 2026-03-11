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
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
