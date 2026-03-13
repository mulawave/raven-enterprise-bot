import { API_BASE_URL, ROUTES } from './constants'
import { getAdminToken, clearAdminToken } from './auth'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearAdminToken()
    if (typeof window !== 'undefined') {
      window.location.href = ROUTES.LOGIN
    }
    throw new ApiError(401, 'Unauthorized')
  }

  if (response.status === 403) {
    throw new ApiError(403, 'Forbidden - Insufficient permissions')
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    let errorData = null

    try {
      errorData = await response.json()
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      errorMessage = await response.text() || errorMessage
    }

    throw new ApiError(response.status, errorMessage, errorData)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (requiresAuth) {
    const token = getAdminToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    return handleResponse<T>(response)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(500, 'Network error or server unavailable')
  }
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}
