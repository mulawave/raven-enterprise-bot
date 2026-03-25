"use client"

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface EmailListEntry {
  id: string
  email: string
  name: string
  city: string | null
  state: string | null
  country: string | null
  created_at: string
}

function RowShimmer() {
  return (
    <tr className="border-b border-gray-100">
      {[32, 40, 20, 20, 20, 16].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3.5 w-${w} rounded bg-gray-200 animate-pulse`} />
        </td>
      ))}
    </tr>
  )
}

export default function EmailListPage() {
  const [entries, setEntries] = useState<EmailListEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api<EmailListEntry[]>('/api/email-list')
      setEntries(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 ring-1 ring-sky-200">
          <span className="text-lg">📧</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email List</h1>
          <p className="text-sm text-gray-500">
            {isLoading ? 'Loading…' : `${entries.length} subscriber${entries.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Mobile card layout */}
        <div className="lg:hidden divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
              </div>
            ))
          ) : entries.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-200 mx-auto mb-3"><span className="text-2xl">📧</span></div>
              <p className="text-sm font-medium text-gray-500">No entries yet</p>
              <p className="text-xs text-gray-400 mt-1">Email addresses will appear here after customers complete checkout.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="p-4 space-y-1.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 shrink-0">
                    {entry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{entry.name}</p>
                    <p className="text-xs text-gray-600 truncate">{entry.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">
                    {[entry.city, entry.state, entry.country].filter(Boolean).join(', ') || '—'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table layout */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Country</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Collected</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <RowShimmer key={i} />)
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                    No entries yet. Email addresses will appear here after customers complete checkout.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.name}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.email}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.city ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.state ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.country ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(entry.created_at).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
