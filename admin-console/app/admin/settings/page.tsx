'use client'

import { useEffect, useState } from 'react'
import ImageUpload from '@/components/ImageUpload'
import Button from '@/components/Button'
import { api } from '@/lib/api'
import { CheckCircle2, AlertCircle, Building2, Globe, Mail, Phone, Image, Star } from 'lucide-react'
import { API_BASE_URL } from '@/lib/constants'

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
  const [draft, setDraft] = useState<Partial<AppSettings>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    setIsLoading(true); setFetchError(null)
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
    setIsSaving(true); setSaveError(null); setSaveSuccess(false)
    try {
      const updated = await api.patch<AppSettings>('/admin/settings', {
        company_name: draft.company_name ?? '',
        company_address: draft.company_address ?? '',
        company_email: draft.company_email ?? '',
        company_phone: draft.company_phone ?? '',
      })
      setSettings(updated); setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoChange = async (url: string) => {
    setSettings((prev) => (prev ? { ...prev, logo_url: url } : prev))
    try { await api.patch('/admin/settings', { logo_url: url }) } catch {}
  }

  const handleFaviconChange = async (url: string) => {
    setSettings((prev) => (prev ? { ...prev, favicon_url: url } : prev))
    try { await api.patch('/admin/settings', { favicon_url: url }) } catch {}
  }

  const S = 'animate-pulse bg-slate-700/60 rounded'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">App Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your platform branding and company information.</p>
      </div>

      {fetchError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Could not load settings</p>
            <p className="text-red-400 mt-0.5">{fetchError}</p>
            <button onClick={fetchSettings} className="mt-2 text-xs text-red-200 underline hover:text-white">Retry</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT COL: Company info form */}
        <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />Company Information
          </h2>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {isLoading ? <div className={`${S} h-4 w-32`} /> : 'Company Name'}
            </label>
            {isLoading ? <div className={`${S} h-10 w-full`} /> : (
              <input
                type="text"
                value={draft.company_name ?? ''}
                onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none transition-colors"
                placeholder="Enter company name"
              />
            )}
          </div>

          {/* Company Address */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              {isLoading ? <div className={`${S} h-4 w-36`} /> : 'Company Address'}
            </label>
            {isLoading ? <div className={`${S} h-24 w-full`} /> : (
              <textarea
                value={draft.company_address ?? ''}
                onChange={(e) => setDraft({ ...draft, company_address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none resize-none transition-colors"
                placeholder="Enter company address"
              />
            )}
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                {isLoading ? <div className={`${S} h-4 w-28 inline-block`} /> : 'Company Email'}
              </label>
              {isLoading ? <div className={`${S} h-10 w-full`} /> : (
                <input
                  type="email"
                  value={draft.company_email ?? ''}
                  onChange={(e) => setDraft({ ...draft, company_email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none transition-colors text-sm"
                  placeholder="contact@company.com"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {isLoading ? <div className={`${S} h-4 w-28 inline-block`} /> : 'Company Phone'}
              </label>
              {isLoading ? <div className={`${S} h-10 w-full`} /> : (
                <input
                  type="tel"
                  value={draft.company_phone ?? ''}
                  onChange={(e) => setDraft({ ...draft, company_phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 outline-none transition-colors text-sm"
                  placeholder="+234 800 000 0000"
                />
              )}
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/40 border border-red-600/50 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-900/40 border border-green-600/50 text-sm text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />Settings saved successfully
            </div>
          )}

          <Button isLoading={isSaving} loadingText="Saving..." onClick={handleSave} disabled={isLoading || isSaving} className="w-full">
            Save Company Info
          </Button>
        </div>

        {/* RIGHT COL: Branding */}
        <div className="space-y-5">
          {/* App Logo card */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Image className="h-5 w-5 text-indigo-400" />App Logo
            </h2>
            <p className="text-xs text-slate-400">Displayed in the admin sidebar and tenant-facing pages. Recommended: 200x60px PNG/SVG.</p>

            {isLoading ? (
              <div className={`${S} h-36 w-full rounded-xl`} />
            ) : settings?.logo_url ? (
              <div className="space-y-3">
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 flex items-center justify-center min-h-[100px]">
                  <img
                    src={`${API_BASE_URL}${settings.logo_url}`}
                    alt="App logo"
                    className="max-h-20 max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <ImageUpload
                  value={null}
                  onChange={handleLogoChange}
                  endpoint="/admin/settings/upload/logo"
                  label="Replace Logo"
                  maxSize={5 * 1024 * 1024}
                />
              </div>
            ) : (
              <ImageUpload
                value={null}
                onChange={handleLogoChange}
                endpoint="/admin/settings/upload/logo"
                label="Upload Logo"
                maxSize={5 * 1024 * 1024}
              />
            )}
          </div>

          {/* Favicon card */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/60 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-400" />Favicon
            </h2>
            <p className="text-xs text-slate-400">Browser tab icon. Recommended: 32x32px or 64x64px ICO/PNG/SVG.</p>

            {isLoading ? (
              <div className={`${S} h-36 w-full rounded-xl`} />
            ) : settings?.favicon_url ? (
              <div className="space-y-3">
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 flex items-center justify-center min-h-[80px]">
                  <img
                    src={`${API_BASE_URL}${settings.favicon_url}`}
                    alt="Favicon"
                    className="h-12 w-12 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <ImageUpload
                  value={null}
                  onChange={handleFaviconChange}
                  endpoint="/admin/settings/upload/favicon"
                  label="Replace Favicon"
                  maxSize={2 * 1024 * 1024}
                />
              </div>
            ) : (
              <ImageUpload
                value={null}
                onChange={handleFaviconChange}
                endpoint="/admin/settings/upload/favicon"
                label="Upload Favicon"
                maxSize={2 * 1024 * 1024}
              />
            )}
          </div>

          {/* Branding tip */}
          <div className="rounded-2xl border border-slate-700/40 bg-slate-800/40 p-5">
            <h3 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-amber-400" />Branding Tips
            </h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Logo: transparent background PNG or SVG works best on dark themes.</li>
              <li>Favicon: use a simple icon or initial — it renders tiny in browser tabs.</li>
              <li>After uploading, do a hard-refresh (Ctrl+Shift+R) to clear the browser cache.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
