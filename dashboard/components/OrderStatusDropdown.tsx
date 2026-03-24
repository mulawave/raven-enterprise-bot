'use client'

import { useState } from 'react'
import { useTenantContext } from '@/lib/tenant-context'
import { api } from '@/lib/api'

interface OrderStatusDropdownProps {
  orderId: string
  currentStatus: string
  onStatusChange?: () => void
  onError?: (msg: string) => void
}

const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']

export default function OrderStatusDropdown({ orderId, currentStatus, onStatusChange, onError }: OrderStatusDropdownProps) {
  const { tenant } = useTenantContext()
  const isSuspended = tenant?.status === 'SUSPENDED'
  const [status, setStatus] = useState(currentStatus)
  const [updating, setUpdating] = useState(false)

  const handleChange = async (newStatus: string) => {
    if (isSuspended) return
    if (newStatus === status) return

    setUpdating(true)
    try {
      await api(`/api/ordering/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setStatus(newStatus)
      onStatusChange?.()
    } catch {
      onError?.('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={updating || isSuspended}
      className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${getStatusColor(status)} disabled:opacity-50`}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  )
}
