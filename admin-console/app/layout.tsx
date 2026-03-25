import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/lib/toast-context'
import DynamicFavicon from '@/components/DynamicFavicon'
import { ThemeProvider } from '@/lib/theme-context'

export const metadata: Metadata = {
  title: 'Raven Business Automator (RBA) — Admin',
  description: 'Enterprise Admin Control Plane',
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
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('raven-admin-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}` }} />
      </head>
      <body className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 min-h-screen relative font-sans antialiased">
        {/* Background pattern overlay */}
        <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDM0djItaDJWMzRoLTJ6bTAgNGgydjJoLTJ2LTJ6bS0yLTJoMnYyaC0ydi0yem0wLTJoMnYyaC0ydi0yem0wIDZoMnYyaC0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40 pointer-events-none z-0"></div>
        
        <div className="relative z-10">
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </div>
        <DynamicFavicon />
      </body>
    </html>
  )
}
