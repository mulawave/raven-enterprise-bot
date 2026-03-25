'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatNaira } from '@/lib/formatters'
import { useTenantContext } from '@/lib/tenant-context'

interface Booking {
  id: string
  customerName: string
  roomType: string
  checkInDate: string
  checkOutDate: string
  totalAmount: number
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
}

const SHIMMER_ROWS = Array.from({ length: 5 })

export default function BookingsPage() {
  const { tenant } = useTenantContext()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await api<Booking[]>(`/api/bookings?tenantId=${tenant?.id ?? ''}`)
        if (isActive) setBookings(Array.isArray(data) ? data : [])
      } catch {
        if (isActive) setError('Failed to load bookings')
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 ring-1 ring-violet-200">
          <span className="text-lg">🏨</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : `${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`}</p>
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
                  <div className="h-3 w-1/3 rounded bg-gray-100 animate-pulse" />
                </div>
              ))
            : bookings.length === 0
            ? <div className="px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-200 mx-auto mb-3"><span className="text-2xl">🏨</span></div>
                <p className="text-sm font-medium text-gray-500">No bookings yet</p>
                <p className="text-xs text-gray-400 mt-1">Room bookings will show up here</p>
              </div>
            : bookings.map((booking) => (
                <div key={booking.id} className="p-4 space-y-2 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{booking.customerName || 'Unknown'}</p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 ${STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-violet-600">{booking.roomType}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{new Date(booking.checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span className="text-gray-300">→</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{new Date(booking.checkOutDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-900">{formatNaira(booking.totalAmount)}</p>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Desktop table layout */}
        <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
            <tr>
              {['Customer', 'Room Type', 'Check-in', 'Check-out', 'Total', 'Status'].map((h) => (
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
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: '65%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : bookings.length === 0
              ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                      No bookings yet
                    </td>
                  </tr>
                )
              : bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {booking.roomType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(booking.checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(booking.checkOutDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNaira(booking.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        STATUS_COLORS[booking.status] ?? 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status}
                      </span>
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
