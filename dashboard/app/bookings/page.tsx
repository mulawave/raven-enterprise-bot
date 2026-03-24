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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {error && (
          <div className="px-6 py-4 text-sm text-red-600 border-b border-red-100 bg-red-50">{error}</div>
        )}
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
  )
}
