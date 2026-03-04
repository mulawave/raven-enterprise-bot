'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { API_ENDPOINTS, ROUTES } from '@/lib/constants'
import { Button } from '@/components/Button'

export default function CreateTenantPage() {
  const [tenantName, setTenantName] = useState('')
  const [planTier, setPlanTier] = useState<'starter' | 'growth' | 'enterprise'>('starter')

  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')

  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await api.post<{ tenant: { id: string } }>(API_ENDPOINTS.TENANTS, {
        tenantName,
        planTier,
        owner: {
          email: ownerEmail,
          password: ownerPassword,
        },
        ...(staffEmail && staffPassword
          ? {
              staff: {
                email: staffEmail,
                password: staffPassword,
              },
            }
          : {}),
      }, { timeoutMs: 60000 })

      router.push(`${ROUTES.TENANTS}/${response.tenant.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Create New Tenant</h1>

      <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Tenant Name
            </label>
            <input
              id="name"
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
              placeholder="Acme Corporation"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="planTier" className="block text-sm font-medium text-slate-700 mb-2">
              Plan Tier
            </label>
            <select
              id="planTier"
              value={planTier}
              onChange={(e) => setPlanTier(e.target.value as any)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900 bg-white"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label htmlFor="ownerEmail" className="block text-sm font-medium text-slate-700 mb-2">
              Owner Email
            </label>
            <input
              id="ownerEmail"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
              placeholder="admin@acme.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="ownerPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Owner Password
            </label>
            <input
              id="ownerPassword"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-semibold text-slate-900">Optional staff user</h2>
            <p className="text-xs text-slate-500 mt-1">If left blank, backend will auto-create a temporary staff user.</p>
          </div>

          <div>
            <label htmlFor="staffEmail" className="block text-sm font-medium text-slate-700 mb-2">
              Staff Email (optional)
            </label>
            <input
              id="staffEmail"
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
              placeholder="staff@acme.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="staffPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Staff Password (optional)
            </label>
            <input
              id="staffPassword"
              type="password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-900"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">Provisioning tenant — this may take up to 30 seconds while we set up the database, users, and subscription&hellip;</p>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              type="submit"
              isLoading={isLoading}
              loadingText="Creating tenant…"
              className="flex-1 py-3"
            >
              Create Tenant
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isLoading}
              className="px-6 py-3"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
