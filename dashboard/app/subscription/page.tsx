"use client"

import { formatBillingDate } from '@/lib/formatters'
import UsageMeter from '@/components/UsageMeter'
import PlanUpgradeModal from '@/components/PlanUpgradeModal'
import { useTenantContext } from '@/lib/tenant-context'

export default function SubscriptionPage() {
  const { subscription } = useTenantContext()

  const daysRemaining = subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const isActive = subscription?.status === 'active'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Subscription & Billing</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {(subscription?.plan ?? 'starter').toUpperCase()} Plan
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isActive ? 'Active' : 'Inactive'} • {daysRemaining} days until renewal
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {subscription?.status}
            </span>
            <PlanUpgradeModal currentPlan={subscription?.plan ?? 'starter'} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600">Billing Started</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formatBillingDate(subscription?.current_period_start)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Renewal</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formatBillingDate(subscription?.current_period_end)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage This Period</h3>
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
            {(subscription?.conversations_limit ?? 0).toLocaleString()} conversations per month
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
