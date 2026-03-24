'use client'

import { useRef, useState } from 'react'
import { api } from '@/lib/api'
import { API_BASE_URL } from '@/lib/constants'
import { getAccessToken } from '@/lib/auth'
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
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSuspended) {
      setMessage({ type: 'error', text: 'This account is suspended. Contact support to make changes.' })
      return
    }
    setSaving(true)
    setMessage(null)

    try {
      await api('/tenant/branding', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: tenant.id,
          name: formData.businessName,
          logoUrl: formData.logoUrl,
          primaryColor: formData.primaryColor,
          whatsappNumber: formData.whatsappNumber,
        }),
      })
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const token = getAccessToken()
      const res = await fetch(`${API_BASE_URL}/tenant/branding/upload/logo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (data.logoUrl) {
        setFormData((prev) => ({ ...prev, logoUrl: data.logoUrl }))
        setMessage({ type: 'success', text: 'Logo uploaded — click Save Changes to apply.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Logo upload failed. Try a JPG, PNG, or SVG under 5 MB.' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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
          Logo
        </label>
        <div className="flex items-center gap-4">
          {formData.logoUrl ? (
            <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={formData.logoUrl.startsWith('/uploads') ? `${API_BASE_URL}${formData.logoUrl}` : formData.logoUrl}
                alt="Logo preview"
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
              <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              disabled={uploading || isSuspended}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading && <span className="h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
              {uploading ? 'Uploading…' : formData.logoUrl ? 'Replace logo' : 'Upload logo'}
            </button>
            <p className="text-xs text-gray-400">JPG, PNG, SVG or WebP · max 5 MB</p>
          </div>
          {formData.logoUrl && (
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, logoUrl: '' }))}
              className="ml-auto text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
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
