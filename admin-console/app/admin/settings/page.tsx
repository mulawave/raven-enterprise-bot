'use client'

import { useEffect, useState } from 'react'
import ImageUpload from '@/components/ImageUpload'
import Button from '@/components/Button'
import { api } from '@/lib/api'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface AppSettings {
  id: string
  logo_url: string | null
  favicon_url: string | null
  company_name: string | null
  company_address: string | null
  company_email: string | null
  company_phone: string | null
}

function FieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`h-10 ${wide ? 'w-full' : 'w-64'} bg-gray-700/60 rounded-lg animate-pulse`} />
  )
}

function LabelSkeleton() {
  return <div className="h-4 w-32 bg-gray-700/60 rounded animate-pulse mb-2" />
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [draft, setDraft] = useState<Partial<AppSettings>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const data = await api.get<AppSettings>('/admin/settings')
      setSettings(data)
      setDraft({
        company_name: data.company_name ?? '',
        company_address: data.company_address ?? '',
        company_email: data.company_email ?? '',
        company_phone: data.company_phone ?? '',
      })
    } catch {
      setFetchError('Failed to load settings. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const updated = await api.patch<AppSettings>('/admin/settings', {
        company_name: draft.company_name ?? '',
        company_address: draft.company_address ?? '',
        company_email: draft.company_email ?? '',
        company_phone: draft.company_phone ?? '',
      })
      setSettings(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoChange = async (url: string) => {
    setSettings((prev) => (prev ? { ...prev, logo_url: url } : prev))
    try {
      await api.patch('/admin/settings', { logo_url: url })
    } catch {
      // non-critical — upload endpoint already persisted the file
    }
  }

  const handleFaviconChange = async (url: string) => {
    setSettings((prev) => (prev ? { ...prev, favicon_url: url } : prev))
    try {
      await api.patch('/admin/settings', { favicon_url: url })
    } catch {
      // non-critical
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-white">App Settings</h1>

      {fetchError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Could not load settings</p>
            <p className="text-red-400 mt-0.5">{fetchError}</p>
            <button onClick={fetchSettings} className="mt-2 text-xs text-red-200 underline hover:text-white">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Branding */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white">Branding</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-36 bg-gray-700/60 rounded-lg animate-pulse" />
            <div className="h-36 bg-gray-700/60 rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUpload
              value={settings?.logo_url}
              onChange={handleLogoChange}
              endpoint="/admin/settings/upload/logo"
              label="App Logo"
              maxSize={5 * 1024 * 1024}
            />
            <ImageUpload
              value={settings?.favicon_url}
              onChange={handleFaviconChange}
              endpoint="/admin/settings/upload/favicon"
              label="App Favicon"
              maxSize={2 * 1024 * 1024}
            />
          </div>
        )}
      </div>

      {/* Company Information */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white">Company Information</h2>

        <div className="space-y-4">
          <div>
            {isLoading ? <LabelSkeleton /> : <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>}
            {isLoading ? <FieldSkeleton wide /> : (
              <input
                type="text"
                value={draft.company_name ?? ''}
                onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                placeholder="Enter company name"
              />
            )}
          </div>

          <div>
            {isLoading ? <LabelSkeleton /> : <label className="block text-sm font-medium text-gray-300 mb-2">Company Address</label>}
            {isLoading ? <div className="h-24 w-full bg-gray-700/60 rounded-lg animate-pulse" /> : (
              <textarea
                value={draft.company_address ?? ''}
                onChange={(e) => setDraft({ ...draft, company_address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors resize-none"
                placeholder="Enter company address"
              />
            )}
          </div>

          <div>
            {isLoading ? <LabelSkeleton /> : <label className="block text-sm font-medium text-gray-300 mb-2">Company Email</label>}
            {isLoading ? <FieldSkeleton wide /> : (
              <input
                type="email"
                value={draft.company_email ?? ''}
                onChange={(e) => setDraft({ ...draft, company_email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                placeholder="contact@company.com"
              />
            )}
          </div>

          <div>
            {isLoading ? <LabelSkeleton /> : <label className="block text-sm font-medium text-gray-300 mb-2">Company Phone</label>}
            {isLoading ? <FieldSkeleton wide /> : (
              <input
                type="tel"
                value={draft.company_phone ?? ''}
                onChange={(e) => setDraft({ ...draft, company_phone: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                placeholder="+1 (555) 000-0000"
              />
            )}
          </div>
        </div>

        {saveError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-900/40 border border-green-600/50 text-sm text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Settings saved successfully
          </div>
        )}

        <div className="pt-2">
          <Button
            isLoading={isSaving}
            loadingText="Saving…"
            onClick={handleSave}
            disabled={isLoading || isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
