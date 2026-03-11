import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_TOKEN_KEY } from './lib/constants'

// Public URL of this admin console. Used to build redirect URLs so they
// always point to the real hostname regardless of the internal socket address.
const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.raven-ai.online'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const withNoStore = (response: NextResponse) => {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  if (pathname === '/admin/login' || pathname === '/') {
    return withNoStore(NextResponse.next())
  }

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get(ADMIN_TOKEN_KEY)?.value
    if (!token) {
      return withNoStore(NextResponse.redirect(new URL('/admin/login', ADMIN_BASE_URL)))
    }
    return withNoStore(NextResponse.next())
  }

  return withNoStore(NextResponse.next())
}

export const config = {
  matcher: ['/', '/admin/:path*'],
}
