// Hardcoded tenant for development
export const TENANT_ID = "test-tenant-1"

// Backend API base URL — override in production via NEXT_PUBLIC_API_URL env var
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
