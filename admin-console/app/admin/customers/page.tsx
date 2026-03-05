'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { API_ENDPOINTS } from '@/lib/constants'

interface Customer {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  created_at: string
  tenant: { id: string; name: string } | null
  _count: { conversations: number; orders: number }
}

interface CustomersResponse {
  customers: Customer[]
  total: number
  page: number
  limit: number
}

function Shimmer({ className }: { className?: string }) {
  return <div className={`bg-slate-700 rounded animate-pulse ${className ?? ''}`} />
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const limit = 50

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      const result = await api.get<CustomersResponse>(`${API_ENDPOINTS.CUSTOMERS_LIST}?${params}`)
      setData(result)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load customers')
    } finally {
      setIsLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Customers</h1>
          {isLoading || !data
            ? <Shimmer className="h-4 w-32 mt-1" />
            : <p className="text-sm text-slate-400 mt-1">{data.total.toLocaleString()} total customers</p>}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, phone…"
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm text-white rounded-lg transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {error && !data && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-slate-400 font-medium">Name</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Contact</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Tenant</th>
              <th className="px-4 py-3 text-slate-400 font-medium text-center">Conversations</th>
              <th className="px-4 py-3 text-slate-400 font-medium text-center">Orders</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <Shimmer className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.customers.length === 0
                ? <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      {search ? `No customers matching "${search}".` : 'No customers yet.'}
                    </td>
                  </tr>
                : data?.customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{customer.name ?? <span className="text-slate-500 italic">unnamed</span>}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{customer.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3">
                        {customer.phone && <p className="text-slate-300">{customer.phone}</p>}
                        {customer.email && <p className="text-slate-400 text-xs">{customer.email}</p>}
                        {!customer.phone && !customer.email && <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{customer.tenant?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-blue-400 font-semibold">{customer._count.conversations}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-400 font-semibold">{customer._count.orders}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(customer.created_at).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages} &mdash; {data.total.toLocaleString()} customers
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-sm text-slate-200 rounded-lg transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-sm text-slate-200 rounded-lg transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
