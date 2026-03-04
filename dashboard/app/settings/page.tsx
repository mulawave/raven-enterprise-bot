"use client"

import BrandingForm from '@/components/BrandingForm'
import { useTenantContext } from '@/lib/tenant-context'

interface BrandingSettings {
  businessName: string
  logoUrl?: string
  primaryColor?: string
  whatsappNumber?: string
}

export default function SettingsPage() {
  const { branding } = useTenantContext()

  const initialSettings: BrandingSettings = {
    businessName: branding.businessName || '',
    logoUrl: branding.logoUrl || '',
    primaryColor: branding.primaryColor || '#0ea5e9',
    whatsappNumber: branding.whatsappNumber || '',
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding Settings</h2>
        <BrandingForm initialSettings={initialSettings} />
      </div>
    </div>
  )
}
