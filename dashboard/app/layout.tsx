import './globals.css'
import type { Metadata } from 'next'
import DashboardShell from '@/components/DashboardShell'

export const metadata: Metadata = {
  title: 'Raven Dashboard',
  description: 'Enterprise Bot Management Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  )
}
