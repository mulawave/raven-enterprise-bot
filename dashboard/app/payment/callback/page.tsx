/**
 * Payment callback forwarding page.
 *
 * Paystack redirects the customer's browser here after payment when the
 * PAYMENT_CALLBACK_URL env var is pointing at app.raven-ai.online (old config
 * or DNS misconfiguration). This page immediately server-redirects the browser
 * to the real backend callback endpoint which handles verification, fulfilment,
 * and returns the branded confirmation HTML — no auth required, no dashboard
 * session needed.
 */
import { redirect } from 'next/navigation'

interface Props {
  searchParams: { reference?: string; trxref?: string; provider?: string }
}

export default function PaymentCallbackPage({ searchParams }: Props) {
  const ref = searchParams.reference ?? searchParams.trxref ?? ''
  const dest = new URL('https://api.raven-ai.online/api/payments/callback')
  if (ref) dest.searchParams.set('reference', ref)
  if (searchParams.provider) dest.searchParams.set('provider', searchParams.provider)
  redirect(dest.toString())
}
