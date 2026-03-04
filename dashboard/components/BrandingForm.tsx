'use client'

import { useState } from 'react'
import { useTenantContext } from '@/lib/tenant-context'

interface BrandingFormProps {
  initialSettings: {
    businessName: string
    logoUrl?: string
    primaryColor?: string
    whatsappNumber?: string
  }
}

export default function BrandingForm({ initialSettings }: BrandingFormProps) {
  const { tenant } = useTenantContext()
  const isSuspended = tenant.status === 'SUSPENDED'
  const [formData, setFormData] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSuspended) {
      setMessage({ type: 'error', text: 'This account is suspended. Contact support to make changes.' })
      return
    }
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('http://localhost:4000/tenant/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant.id,
          ...formData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Name *
        </label>
        <input
          type="text"
          required
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo URL
        </label>
        <input
          type="url"
          value={formData.logoUrl || ''}
          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Color
        </label>
        <div className="flex gap-3">
          <input
            type="color"
            value={formData.primaryColor || '#0ea5e9'}
            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
            className="w-20 h-10 border border-gray-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={formData.primaryColor || '#0ea5e9'}
            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="#0ea5e9"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          WhatsApp Number
        </label>
        <input
          type="tel"
          value={formData.whatsappNumber || ''}
          onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="+234XXXXXXXXXX"
        />
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || isSuspended}
        className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isSuspended ? 'Suspended' : saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
