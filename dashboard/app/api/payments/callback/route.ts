/**
 * Dashboard-side passthrough for Paystack payment callbacks.
 *
 * Any payment link that was already issued with callback URL
 * https://app.raven-ai.online/api/payments/callback (old config) will land
 * here. We immediately 302-redirect to the real backend endpoint which does
 * the verification, fulfillment, and returns the branded confirmation page.
 *
 * No auth. No session. No dashboard shell. Pure server-side redirect.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams
  const dest = new URL('https://api.raven-ai.online/api/payments/callback')

  // Forward all query params Paystack sends (reference, trxref, provider, etc.)
  incoming.forEach((value, key) => {
    dest.searchParams.set(key, value)
  })

  return NextResponse.redirect(dest.toString(), { status: 302 })
}
