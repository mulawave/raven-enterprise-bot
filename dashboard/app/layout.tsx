import './globals.css'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import DashboardShell from '@/components/DashboardShell'
import CookieConsent from '@/components/CookieConsent'
import DynamicFavicon from '@/components/DynamicFavicon'
import { ThemeProvider } from '@/lib/theme-context'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('raven-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}` }} />
      </head>
      <body>
        <ThemeProvider>
          <Suspense fallback={null}>
            <DashboardShell>{children}</DashboardShell>
          </Suspense>
          <CookieConsent />
          <DynamicFavicon />
        </ThemeProvider>
      </body>
    </html>
  )
}
