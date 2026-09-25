"use client"

import { useEffect, useState } from 'react'
import { formatBillingDate } from '@/lib/formatters'
import UsageMeter from '@/components/UsageMeter'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'
import { useTenantContext } from '@/lib/tenant-context'
import { api } from '@/lib/api'

interface BillingStatus {
  isTrialActive: boolean
  trialEndsAt: string | null
  daysRemaining: number
  postTrialPlanTier: string | null
  cancelAtPeriodEnd: boolean
  cardLast4: string | null
  cardBrand: string | null
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  past_due: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export default function SubscriptionPage() {
  const { subscription } = useTenantContext()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [busy, setBusy] = useState<'cancel' | 'pay' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<BillingStatus>('/api/subscription/trial/status')
      .then(setBilling)
      .catch(() => setBilling(null))
  }, [])

  const status = subscription?.status ?? 'active'
  const isTrial = status === 'trial'
  const isPaused = status === 'past_due' || status === 'cancelled'
  const planName = `${(billing?.postTrialPlanTier ?? subscription?.plan ?? 'starter').toUpperCase()} Plan`

  const daysRemaining = subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  async function toggleAutoRenew() {
    if (!billing) return
    const cancel = !billing.cancelAtPeriodEnd
    if (cancel && !confirm(isTrial
      ? 'Cancel your trial? You keep full access until the trial ends and your card will not be charged.'
      : 'Turn off automatic renewal? You keep access until the end of the current period.')) return
    setBusy('cancel')
    setError(null)
    try {
      const result = await api<{ cancelAtPeriodEnd: boolean }>('/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({ cancel }),
      })
      setBilling({ ...billing, cancelAtPeriodEnd: result.cancelAtPeriodEnd })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your subscription.')
    } finally {
      setBusy(null)
    }
  }

  async function payNow() {
    setBusy('pay')
    setError(null)
    try {
      const result = await api<{ authorizationUrl?: string; already_paid?: boolean }>('/api/subscription/payment/initialize', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (result.authorizationUrl) window.location.href = result.authorizationUrl
      else window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment.')
      setBusy(null)
    }
  }

  const renewalLabel = isTrial
    ? billing?.cancelAtPeriodEnd
      ? `Trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — auto-renew is off`
      : `Free trial • ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`
    : isPaused
      ? 'Assistant paused'
      : billing?.cancelAtPeriodEnd
        ? `Ends in ${daysRemaining} days — auto-renew is off`
        : `Active • ${daysRemaining} days until renewal`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscription & Billing</h1>

      {isPaused && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-900">Your assistant is paused</h2>
          <p className="mt-1 text-sm text-red-800">
            {status === 'past_due'
              ? "We couldn't charge your card, so your assistant has stopped replying to customers."
              : 'Your subscription has ended, so your assistant has stopped replying to customers.'}{' '}
            Your settings, FAQs and conversations are safe — pay to switch everything back on instantly.
          </p>
          <button
            type="button"
            onClick={payNow}
            disabled={busy !== null}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy === 'pay' ? 'Redirecting to Paystack…' : 'Pay now & resume'}
          </button>
        </div>
      )}

      {isTrial && billing && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-semibold text-blue-900">
            {billing.daysRemaining} day{billing.daysRemaining === 1 ? '' : 's'} left in your free trial
          </h2>
          <p className="mt-1 text-sm text-blue-800">
            {billing.cancelAtPeriodEnd
              ? `Your trial ends on ${formatBillingDate(billing.trialEndsAt ?? undefined)} and your card will not be charged.`
              : `On ${formatBillingDate(billing.trialEndsAt ?? undefined)} your ${billing.cardBrand ?? 'card'} ending ${billing.cardLast4 ?? '••••'} will be charged for the ${planName}.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={payNow}
              disabled={busy !== null}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === 'pay' ? 'Redirecting…' : 'Upgrade now'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{planName}</h2>
            <p className="text-sm text-gray-600 mt-1">{renewalLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-800'}`}>
              {status === 'past_due' ? 'paused' : status}
            </span>
            {!isTrial && !isPaused && <PlanUpgradeModal currentPlan={subscription?.plan ?? 'starter'} />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">{isTrial ? 'Trial Started' : 'Billing Started'}</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formatBillingDate(subscription?.current_period_start)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{isTrial ? 'First Charge' : 'Next Renewal'}</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {billing?.cancelAtPeriodEnd || isPaused ? '—' : formatBillingDate(subscription?.current_period_end)}
            </p>
          </div>
        </div>

        {billing?.cardLast4 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium capitalize">{billing.cardBrand ?? 'Card'}</span> ending {billing.cardLast4}
              <span className="text-gray-500"> • {billing.cancelAtPeriodEnd ? 'auto-renew off' : 'charged automatically'}</span>
            </p>
            {(isTrial || status === 'active') && (
              <button
                type="button"
                onClick={toggleAutoRenew}
                disabled={busy !== null}
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                {busy === 'cancel'
                  ? 'Saving…'
                  : billing.cancelAtPeriodEnd
                    ? 'Turn auto-renew back on'
                    : isTrial ? 'Cancel trial' : 'Turn off auto-renew'}
              </button>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{isTrial ? 'Trial Usage' : 'Usage This Period'}</h3>
          <UsageMeter
            label="Conversations"
            used={subscription?.conversations_used ?? 0}
            limit={subscription?.conversations_limit ?? 1}
            unit="conversations"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Features</h3>
        <ul className="space-y-2">
          <li className="flex items-center text-sm text-gray-600">
            <span className="mr-2">✅</span>
            {(subscription?.conversations_limit ?? 0).toLocaleString()} conversations {isTrial ? 'during your trial' : 'per month'}
          </li>
          <li className="flex items-center text-sm text-gray-600">
            <span className="mr-2">✅</span>
            AI-powered customer support
          </li>
          <li className="flex items-center text-sm text-gray-600">
            <span className="mr-2">✅</span>
            Order management & bookings
          </li>
          <li className="flex items-center text-sm text-gray-600">
            <span className="mr-2">✅</span>
            Payment integrations (Paystack, Flutterwave)
          </li>
        </ul>
      </div>
    </div>
  )
}
