'use client'

import { useEffect, useState } from 'react'
import ImageUpload from '@/components/ImageUpload'
import { api } from '@/lib/api'

interface AppSettings {
  id: string
  logo_url: string | null
  favicon_url: string | null
  company_name: string | null
  company_address: string | null
  company_email: string | null
  company_phone: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const data = await api.get<AppSettings>('/admin/settings')
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateField = async (field: keyof AppSettings, value: string) => {
    if (!settings) return

    setSaving(field)
    try {
      const updated = await api.patch<AppSettings>('/admin/settings', { [field]: value })
      setSettings(updated)
    } catch (error) {
      console.error('Failed to update settings:', error)
    } finally {
      setSaving(null)
    }
  }

  const handleInputChange = (field: keyof AppSettings, value: string) => {
    if (!settings) return
    setSettings({ ...settings, [field]: value })
  }

  const handleInputBlur = (field: keyof AppSettings, value: string) => {
    updateField(field, value)
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-9 w-40 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-6">
          <div className="h-6 w-24 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-36 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-6">
          <div className="h-6 w-40 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-28 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded animate-pulse" />
              <div className="h-10 w-full bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load settings</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-white">App Settings</h1>

      {/* Branding Section */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4">Branding</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUpload
            value={settings.logo_url}
            onChange={(url) => {
              setSettings({ ...settings, logo_url: url })
            }}
            endpoint="/admin/settings/upload/logo"
            label="App Logo"
            maxSize={5 * 1024 * 1024}
          />

          <ImageUpload
            value={settings.favicon_url}
            onChange={(url) => {
              setSettings({ ...settings, favicon_url: url })
            }}
            endpoint="/admin/settings/upload/favicon"
            label="App Favicon"
            maxSize={2 * 1024 * 1024}
          />
        </div>
      </div>

      {/* Company Information Section */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white mb-4">Company Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Name
              {saving === 'company_name' && (
                <span className="ml-2 text-xs text-blue-400">Saving...</span>
              )}
            </label>
            <input
              type="text"
              value={settings.company_name || ''}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              onBlur={(e) => handleInputBlur('company_name', e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Address
              {saving === 'company_address' && (
                <span className="ml-2 text-xs text-blue-400">Saving...</span>
              )}
            </label>
            <textarea
              value={settings.company_address || ''}
              onChange={(e) => handleInputChange('company_address', e.target.value)}
              onBlur={(e) => handleInputBlur('company_address', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
              placeholder="Enter company address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Email
              {saving === 'company_email' && (
                <span className="ml-2 text-xs text-blue-400">Saving...</span>
              )}
            </label>
            <input
              type="email"
              value={settings.company_email || ''}
              onChange={(e) => handleInputChange('company_email', e.target.value)}
              onBlur={(e) => handleInputBlur('company_email', e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              placeholder="contact@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Phone
              {saving === 'company_phone' && (
                <span className="ml-2 text-xs text-blue-400">Saving...</span>
              )}
            </label>
            <input
              type="tel"
              value={settings.company_phone || ''}
              onChange={(e) => handleInputChange('company_phone', e.target.value)}
              onBlur={(e) => handleInputBlur('company_phone', e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Auto-save:</strong> All changes are saved automatically when you finish editing each field.
        </p>
      </div>
    </div>
  )
}
