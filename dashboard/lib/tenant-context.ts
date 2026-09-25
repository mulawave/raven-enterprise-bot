"use client"

import { createContext, useContext } from 'react'

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL'
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'pending_payment'
export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise'

export interface TenantInfo {
  id: string
  name: string
  status: TenantStatus
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  conversations_used: number
  conversations_limit: number
  current_period_start?: string
  current_period_end: string
}

export interface BrandingInfo {
  businessName: string
  logoUrl: string
  primaryColor: string
  whatsappNumber: string
}

export interface FeatureFlags {
  ordering: boolean
  bookings: boolean
  payments: boolean
  messaging: boolean
}

export interface TenantContextValue {
  tenant: TenantInfo
  subscription: SubscriptionInfo
  branding: BrandingInfo
  features: FeatureFlags
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function useTenantContext() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenantContext must be used within TenantProvider')
  }
  return context
}

export { TenantContext }
