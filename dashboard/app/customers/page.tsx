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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Customers</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 border-b border-red-100 bg-red-50">{error}</div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
  )
}
