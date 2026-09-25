import './globals.css'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import DashboardShell from '@/components/DashboardShell'
import CookieConsent from '@/components/CookieConsent'
import DynamicFavicon from '@/components/DynamicFavicon'
import { ThemeProvider } from '@/lib/theme-context'
import ActivationGate from '@/components/ActivationGate'

export const metadata: Metadata = {
  title: 'Raven Business Automator (RBA)',
  description: 'Enterprise Bot Management Dashboard',
  icons: [{ rel: 'icon', url: '/raven.png', type: 'image/png' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('raven-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider>
          <ActivationGate>
            <Suspense fallback={null}>
              <DashboardShell>{children}</DashboardShell>
            </Suspense>
            <CookieConsent />
          </ActivationGate>
          <DynamicFavicon />
        </ThemeProvider>
      </body>
    </html>
  )
}
