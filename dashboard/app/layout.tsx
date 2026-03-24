import './globals.css'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import DashboardShell from '@/components/DashboardShell'
import CookieConsent from '@/components/CookieConsent'
import DynamicFavicon from '@/components/DynamicFavicon'

export const metadata: Metadata = {
  title: 'Raven Business Automator (RBA)',
  description: 'Enterprise Bot Management Dashboard',
  icons: [],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <DashboardShell>{children}</DashboardShell>
        </Suspense>
        <CookieConsent />
        <DynamicFavicon />
      </body>
    </html>
  )
}
