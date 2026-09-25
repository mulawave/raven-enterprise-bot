import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, Spacing, BrandColors } from '../constants/theme'
import { Card, Badge, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Subscription {
  status: string
  plan: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  conversationsUsed: number
  conversationsLimit: number
}

interface ApiPlan {
  tier: string
  features: string[]
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Subscription'>
}

const FALLBACK_PLAN_FEATURES: Record<string, string[]> = {
  free: ['100 conversations/month', 'Basic AI bot', 'WhatsApp integration', 'Order management'],
  starter: ['500 conversations/month', 'Advanced AI bot', 'WhatsApp integration', 'Order & booking management', 'Email list'],
  pro: ['2,000 conversations/month', 'Premium AI bot', 'All integrations', 'Full analytics', 'Priority support'],
  enterprise: ['Unlimited conversations', 'Custom AI training', 'All features', 'Dedicated support', 'SLA guarantee'],
}

export function SubscriptionScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [sub, setSub] = useState<Subscription | null>(null)
  const [planFeatures, setPlanFeatures] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchSubscription = useCallback(async () => {
    try {
      const [ctxRes, plansRes] = await Promise.all([
        api<any>('/tenant/context').catch(() => null),
        api<any>('/api/plans').catch(() => null),
      ])
      const raw = ctxRes?.subscription ?? ctxRes?.data?.subscription
      if (raw) {
        setSub({
          status: raw.status || 'active',
          plan: raw.plan || 'free',
          currentPeriodStart: raw.current_period_start || raw.currentPeriodStart || '',
          currentPeriodEnd: raw.current_period_end || raw.currentPeriodEnd || '',
          conversationsUsed: raw.conversations_used ?? raw.conversationsUsed ?? 0,
          conversationsLimit: raw.conversations_limit ?? raw.conversationsLimit ?? 100,
        })
      }
      const apiPlans: ApiPlan[] = plansRes?.plans ?? plansRes?.data?.plans ?? []
      if (apiPlans.length > 0) {
        const map: Record<string, string[]> = {}
        for (const p of apiPlans) { map[p.tier] = p.features }
        setPlanFeatures(map)
      }
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubscription() }, [fetchSubscription])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchSubscription()
    setRefreshing(false)
  }

  function formatDate(d: string) {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d }
  }

  function daysUntil(d: string) {
    if (!d) return null
    try {
      const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return diff > 0 ? diff : 0
    } catch { return null }
  }

  const statusColors: Record<string, { color: string; bg: string }> = {
    active: { color: '#00B894', bg: '#00B89418' },
    trial: { color: '#74B9FF', bg: '#74B9FF18' },
    trialing: { color: '#74B9FF', bg: '#74B9FF18' },
    cancelled: { color: '#FF7675', bg: '#FF767518' },
    past_due: { color: '#FDCB6E', bg: '#FDCB6E18' },
    canceled: { color: '#FF7675', bg: '#FF767518' },
    expired: { color: '#636E72', bg: '#636E7218' },
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#00B89420', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="diamond" size={16} color="#00B894" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Subscription</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
                <ShimmerRow width="40%" />
                <ShimmerRow width="70%" height={12} />
                <ShimmerRow width="50%" height={12} />
              </View>
            ))}
          </>
        ) : !sub ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="diamond-outline" size={48} color={colors.textMuted} />
            <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, marginTop: 12 }}>Subscription info unavailable</Text>
          </View>
        ) : (
          <>
            {/* Plan card */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>
                    {sub.plan}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Current Plan</Text>
                </View>
                <Badge
                  label={sub.status.replace('_', ' ').toUpperCase()}
                  color={(statusColors[sub.status] ?? statusColors.active).color}
                  bgColor={(statusColors[sub.status] ?? statusColors.active).bg}
                />
              </View>
              {sub.currentPeriodEnd && daysUntil(sub.currentPeriodEnd) !== null && (
                <View style={{ backgroundColor: `${colors.info}12`, borderRadius: BorderRadius.sm, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="time-outline" size={14} color={colors.info} />
                  <Text style={{ fontSize: FontSize.xs, color: colors.info }}>
                    {daysUntil(sub.currentPeriodEnd)} days until renewal
                  </Text>
                </View>
              )}
            </Card>

            {/* Billing dates */}
            {(sub.currentPeriodStart || sub.currentPeriodEnd) && (
              <Card>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Billing Period</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Start</Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>{formatDate(sub.currentPeriodStart || '')}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>End</Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>{formatDate(sub.currentPeriodEnd || '')}</Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Usage meter */}
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Usage</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Conversations</Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
                  {sub.conversationsUsed} / {sub.conversationsLimit}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceElevated, overflow: 'hidden' }}>
                <View style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: (sub.conversationsUsed / sub.conversationsLimit) > 0.9 ? '#FF7675' : (sub.conversationsUsed / sub.conversationsLimit) > 0.7 ? '#FDCB6E' : '#00B894',
                  width: `${Math.min(100, (sub.conversationsUsed / sub.conversationsLimit) * 100)}%`,
                }} />
              </View>
              <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 4 }}>
                {Math.round((sub.conversationsUsed / sub.conversationsLimit) * 100)}% used this period
              </Text>
            </Card>

            {/* Plan features */}
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Plan Features</Text>
              <View style={{ gap: 8 }}>
                {(planFeatures[sub.plan.toLowerCase()] ?? FALLBACK_PLAN_FEATURES[sub.plan.toLowerCase()] ?? FALLBACK_PLAN_FEATURES.free).map((feature, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#00B894" />
                    <Text style={{ fontSize: FontSize.sm, color: colors.text }}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  )
}
