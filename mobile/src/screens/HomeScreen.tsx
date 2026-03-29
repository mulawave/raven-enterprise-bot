import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { Spacing, FontSize, BorderRadius, BrandColors } from '../constants/theme'
import { API_BASE_URL } from '../constants/config'
import { RefreshableScrollView, StatCard, Card, SectionHeader, ShimmerRow, Badge } from '../components/ui'
import { DashboardTour, useShouldShowTour } from '../components/DashboardTour'
import { OnboardingChecklist } from '../components/OnboardingChecklist'
import { useBadges } from '../contexts/BadgeContext'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { HomeStackParamList } from '../navigation'

interface Props {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>
}

export function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { session } = useAuth()
  const insets = useSafeAreaInsets()
  const [showTour, dismissTour] = useShouldShowTour()
  const { badges } = useBadges()

  const [refreshing, setRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    orders: 0,
    conversations: 0,
    revenue: 0,
    customers: 0,
  })
  const [paymentBreakdown, setPaymentBreakdown] = useState({ total: 0, paid: 0, pending: 0, failed: 0 })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [tenantContext, setTenantContext] = useState<any>(null)
  const [logoFailed, setLogoFailed] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, ordersRes, contextRes, paymentsRes, contactsRes] = await Promise.all([
        api<any>('/api/analytics/summary').catch(() => null),
        api<any>('/api/ordering/orders').catch(() => []),
        api<any>('/tenant/context').catch(() => null),
        api<any>('/api/payments/list').catch(() => []),
        api<any>('/api/contacts').catch(() => []),
      ])
      const rawContacts: any[] = Array.isArray(contactsRes) ? contactsRes : (contactsRes?.data ?? [])
      setContacts(rawContacts)

      setStats({
        orders: analyticsRes?.orders ?? 0,
        conversations: analyticsRes?.conversations ?? 0,
        revenue: analyticsRes?.payments ?? 0,
        customers: analyticsRes?.customers ?? 0,
      })
      const rawOrders = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data ?? [])
      setRecentOrders(rawOrders.slice(0, 3).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number ?? null,
        status: (o.status || '').toUpperCase(),
        totalAmount: o.total_kobo ?? o.totalAmount ?? o.total ?? 0,
        customer: o.customer,
        createdAt: o.created_at || o.createdAt,
        items: o.orderItems || o.items || [],
      })))
      // Compute payment breakdown by status
      const payments = Array.isArray(paymentsRes) ? paymentsRes : []
      const breakdown = { total: payments.length, paid: 0, pending: 0, failed: 0 }
      for (const p of payments) {
        const s = (p.status || '').toLowerCase()
        if (s === 'paid' || s === 'success') breakdown.paid++
        else if (s === 'pending') breakdown.pending++
        else if (s === 'failed' || s === 'cancelled') breakdown.failed++
      }
      setPaymentBreakdown(breakdown)

      setTenantContext(contextRes)
    } catch {
      // Silently fail — data shows shimmer/empty
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  function formatKobo(kobo: number) {
    return `₦${(kobo / 100).toLocaleString()}`
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: colors.header,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Brand logo — always fall back to local icon.png */}
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: BrandColors.navyDark }}>
              {(() => {
                const raw = tenantContext?.branding?.logoUrl
                const uri = raw ? (raw.startsWith('http') ? raw : `${API_BASE_URL}${raw}`) : null
                return (
                  <Image
                    source={!logoFailed && uri ? { uri } : require('../../assets/icon.png')}
                    style={{ width: 44, height: 44 }}
                    resizeMode="cover"
                    onError={() => setLogoFailed(true)}
                  />
                )
              })()}
            </View>
            <View>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>{greeting}</Text>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: colors.text }}>
                {tenantContext?.branding?.businessName || session?.tenant?.name || session?.user?.name?.split(' ')[0] || 'Raven'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={{
              width: 40,
              height: 40,
              borderRadius: BorderRadius.md,
              backgroundColor: colors.surfaceElevated,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {badges.notifications > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: '#FF3B30',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 2,
                  borderColor: colors.header,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                  {badges.notifications > 99 ? '99+' : badges.notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <RefreshableScrollView refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: 20 }}>
          {/* Onboarding checklist */}
          <View style={{ marginBottom: 20 }}>
            <OnboardingChecklist navigation={navigation} />
          </View>

          {/* Stats grid */}
          <SectionHeader title="Overview" icon="bar-chart" iconColor={BrandColors.navyDark} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {isLoading ? (
              <>
                <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <ShimmerRow width={40} height={40} />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="60%" />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="40%" height={24} />
                </View>
                <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <ShimmerRow width={40} height={40} />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="60%" />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="40%" height={24} />
                </View>
              </>
            ) : (
              <>
                <StatCard
                  title="Orders"
                  value={stats.orders}
                  icon="receipt"
                  color={BrandColors.navyDark}
                  colorBg={`${BrandColors.navyDark}20`}
                />
                <StatCard
                  title="Conversations"
                  value={stats.conversations}
                  icon="chatbubbles"
                  color={BrandColors.orangeBold}
                  colorBg={`${BrandColors.orangeBold}20`}
                />
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            {isLoading ? (
              <>
                <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <ShimmerRow width={40} height={40} />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="60%" />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="40%" height={24} />
                </View>
                <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <ShimmerRow width={40} height={40} />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="60%" />
                  <View style={{ height: 8 }} />
                  <ShimmerRow width="40%" height={24} />
                </View>
              </>
            ) : (
              <>
                <StatCard
                  title="Customers"
                  value={stats.customers}
                  icon="people"
                  color={BrandColors.navyLight}
                  colorBg={`${BrandColors.navyLight}20`}
                />
                <StatCard
                  title="Payments"
                  value={paymentBreakdown.total}
                  icon="card"
                  color={BrandColors.orangeWarm}
                  colorBg={`${BrandColors.orangeWarm}20`}
                >
                  {paymentBreakdown.total > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#4ade80' }}>
                        {paymentBreakdown.paid}
                      </Text>
                      {paymentBreakdown.pending > 0 && (
                        <>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>/</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#facc15' }}>
                            {paymentBreakdown.pending}
                          </Text>
                        </>
                      )}
                      {paymentBreakdown.failed > 0 && (
                        <>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>/</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#f87171' }}>
                            {paymentBreakdown.failed}
                          </Text>
                        </>
                      )}
                      <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 3 }}>
                        {'paid/pend' + (paymentBreakdown.failed > 0 ? '/fail' : '')}
                      </Text>
                    </View>
                  )}
                </StatCard>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20 }} />

          {/* Subscription info */}
          {tenantContext?.subscription && (
            <>
              <SectionHeader title="Subscription" icon="diamond" iconColor={BrandColors.orangeBold} />
              <Card style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>
                      {tenantContext.subscription.plan || 'Starter'}
                    </Text>
                    <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4 }}>
                      {tenantContext.subscription.conversations_used ?? 0} / {tenantContext.subscription.conversations_limit ?? 0} conversations
                    </Text>
                  </View>
                  <Badge
                    label={tenantContext.subscription.status === 'active' ? 'Active' : (tenantContext.subscription.status || 'Trial')}
                    color={tenantContext.subscription.status === 'active' ? '#00B894' : colors.warning}
                    bgColor={tenantContext.subscription.status === 'active' ? '#00B89420' : `${colors.warning}20`}
                  />
                </View>
                {/* Progress bar */}
                {(() => {
                  const used = tenantContext.subscription.conversations_used ?? 0
                  const limit = tenantContext.subscription.conversations_limit ?? 1
                  const pct = Math.min((used / limit) * 100, 100)
                  const barColor = pct > 85 ? colors.error : pct > 60 ? BrandColors.orangeBold : BrandColors.navyDark
                  return (
                    <View style={{ marginTop: 14 }}>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: colors.surfaceElevated,
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            height: 8,
                            width: `${pct}%`,
                            backgroundColor: barColor,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 6, textAlign: 'right' }}>
                        {Math.round(pct)}% used
                      </Text>
                    </View>
                  )
                })()}
              </Card>
            </>
          )}

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20 }} />

          {/* Recent orders */}
          <SectionHeader title="Recent Orders" icon="receipt" iconColor={BrandColors.navyDark} />
          {isLoading ? (
            <Card>
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={{ paddingVertical: 12, gap: 8 }}>
                  <ShimmerRow width="70%" />
                  <ShimmerRow width="40%" height={12} />
                </View>
              ))}
            </Card>
          ) : recentOrders.length === 0 ? (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 8 }}>
                  No orders yet
                </Text>
              </View>
            </Card>
          ) : (
            <Card style={{ padding: 0 }}>
              {recentOrders.map((order, idx) => (
                <View
                  key={order.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: idx < recentOrders.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                      #{order.orderNumber || order.id?.slice(0, 8)}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                      {(() => {
                        const phone = order.customer?.phone || ''
                        const saved = phone ? contacts.find((c: any) => c.phone === phone) : null
                        return saved?.name || order.customer?.name || 'Customer'
                      })()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.primary }}>
                      {formatKobo(order.totalAmount ?? order.total ?? 0)}
                    </Text>
                    <Badge
                      label={order.status || 'PENDING'}
                      color={order.status === 'COMPLETED' ? '#00B894' : BrandColors.orangeBold}
                      bgColor={order.status === 'COMPLETED' ? '#00B89418' : `${BrandColors.orangeBold}18`}
                    />
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      </RefreshableScrollView>

      {/* Dashboard tour overlay */}
      {showTour && <DashboardTour onDismiss={dismissTour} />}
    </View>
  )
}
