import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_TOKEN_KEY } from './lib/constants'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public admin login - allow access
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Protect all other /admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get(ADMIN_TOKEN_KEY)?.value
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
