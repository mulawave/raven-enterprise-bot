'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/formatters'
import { useTenantContext } from '@/lib/tenant-context'

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

const SHIMMER_ROWS = Array.from({ length: 5 })

export default function CustomersPage() {
  const { tenant } = useTenantContext()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await api<Customer[]>(
          `/api/customers`
        )
        if (isActive) setCustomers(Array.isArray(data) ? data : [])
      } catch {
        if (isActive) setError('Failed to load customers')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    if (tenant?.id) load()

    return () => { isActive = false }
  }, [tenant?.id])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 ring-1 ring-blue-200">
          <span className="text-lg">👥</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : `${customers.length} customer${customers.length !== 1 ? 's' : ''}`}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {error && (
          <div className="px-5 py-3 text-sm text-red-700 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" /></svg>
            {error}
          </div>
        )}

        {/* Mobile card layout */}
        <div className="lg:hidden divide-y divide-gray-100">
          {isLoading
            ? SHIMMER_ROWS.map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
                </div>
              ))
            : customers.length === 0
            ? <div className="px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-200 mx-auto mb-3"><span className="text-2xl">👥</span></div>
                <p className="text-sm font-medium text-gray-500">No customers yet</p>
                <p className="text-xs text-gray-400 mt-1">Customers appear after their first interaction</p>
              </div>
            : customers.map((c) => (
                <div key={c.id} className="p-4 space-y-1.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 shrink-0">
                      {(c.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name ?? 'Unknown'}</p>
                      {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                    </div>
                  </div>
                  {c.email && <p className="text-xs text-gray-500 truncate pl-12">{c.email}</p>}
                  <p className="text-xs text-gray-400 pl-12">{formatDate(c.created_at)}</p>
                </div>
              ))
          }
        </div>

        {/* Desktop table layout */}
        <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
            <tr>
              {['Name', 'Email', 'Phone', 'Joined'].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading
              ? SHIMMER_ROWS.map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: j === 0 ? '70%' : j === 1 ? '80%' : '55%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : customers.length === 0
              ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                      No customers yet
                    </td>
                  </tr>
                )
              : customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {c.name ?? <span className="italic text-gray-400">Unknown</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {c.email ?? <span className="italic text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {c.phone ?? <span className="italic text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
