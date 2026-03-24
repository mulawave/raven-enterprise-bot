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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${entries.length} subscriber${entries.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
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
