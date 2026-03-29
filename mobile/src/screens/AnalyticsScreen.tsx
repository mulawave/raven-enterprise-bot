import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, Spacing } from '../constants/theme'
import { StatCard, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface AnalyticsSummary {
  orders: number
  bookings: number
  customers: number
  conversations: number
  contacts: number
  payments: number
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Analytics'>
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#00B894', paid: '#00B894', success: '#00B894',
  confirmed: '#0984E3', processing: '#0984E3',
  pending: '#FDCB6E', awaiting: '#FDCB6E',
  cancelled: '#FF7675', failed: '#FF7675', rejected: '#FF7675',
}

function getStatusColor(s: string) {
  return STATUS_COLORS[s] || '#A29BFE'
}

export function AnalyticsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [revenueKobo, setRevenueKobo] = useState(0)
  const [orderBreakdown, setOrderBreakdown] = useState<Record<string, number>>({})
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    try {
      const [res, ordersRes, paymentsRes] = await Promise.all([
        api<any>('/api/analytics/summary'),
        api<any>('/api/ordering/orders').catch(() => []),
        api<any>('/api/payments/list').catch(() => []),
      ])
      const raw = res?.data ?? res
      if (raw) {
        setData({
          orders: raw.orders ?? 0,
          bookings: raw.bookings ?? 0,
          customers: raw.customers ?? 0,
          conversations: raw.conversations ?? 0,
          contacts: raw.contacts ?? 0,
          payments: raw.payments ?? 0,
        })
      }
      // Revenue & order breakdown
      const orders: any[] = ordersRes?.data ?? ordersRes ?? []
      let rev = 0
      const oStatus: Record<string, number> = {}
      for (const o of orders) {
        rev += o.total_kobo ?? 0
        const s = (o.status || 'unknown').toLowerCase()
        oStatus[s] = (oStatus[s] || 0) + 1
      }
      setRevenueKobo(rev)
      setOrderBreakdown(oStatus)
      // Payment breakdown
      const payments: any[] = paymentsRes?.data ?? paymentsRes ?? []
      const pStatus: Record<string, number> = {}
      for (const p of payments) {
        const s = (p.status || 'unknown').toLowerCase()
        pStatus[s] = (pStatus[s] || 0) + 1
      }
      setPaymentBreakdown(pStatus)
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
  }

  const stats: { title: string; key: keyof AnalyticsSummary; icon: keyof typeof Ionicons.glyphMap; color: string; colorBg: string }[] = [
    { title: 'Orders', key: 'orders', icon: 'receipt', color: '#74B9FF', colorBg: '#74B9FF20' },
    { title: 'Bookings', key: 'bookings', icon: 'calendar', color: '#A29BFE', colorBg: '#A29BFE20' },
    { title: 'Customers', key: 'customers', icon: 'people', color: '#00B894', colorBg: '#00B89420' },
    { title: 'Conversations', key: 'conversations', icon: 'chatbubbles', color: '#0984E3', colorBg: '#0984E320' },
    { title: 'Contacts', key: 'contacts', icon: 'book', color: '#FDCB6E', colorBg: '#FDCB6E20' },
    { title: 'Payments', key: 'payments', icon: 'card', color: '#00B894', colorBg: '#00B89420' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#0984E320', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="bar-chart" size={16} color="#0984E3" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Analytics</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ width: '47%', backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
                <ShimmerRow width={40} height={40} />
                <ShimmerRow width="50%" height={12} />
                <ShimmerRow width="30%" />
              </View>
            ))}
          </View>
        ) : !data ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
            <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, marginTop: 12 }}>Analytics unavailable</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Revenue card */}
            <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: BorderRadius.sm, backgroundColor: '#00B89420', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cash" size={20} color="#00B894" />
                </View>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary }}>Total Revenue</Text>
              </View>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#00B894' }}>
                ₦{(revenueKobo / 100).toLocaleString()}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 }}>
                from {data.orders} order{data.orders !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Stat grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {stats.map(s => {
                const totalFromList = s.key === 'payments'
                  ? Object.values(paymentBreakdown).reduce((a, b) => a + b, 0)
                  : 0
                const val = s.key === 'payments' && totalFromList > 0 ? totalFromList : data[s.key]
                return (
                  <View key={s.key} style={{ width: '47%' }}>
                    <StatCard
                      title={s.title}
                      value={val}
                      icon={s.icon}
                      color={s.color}
                      colorBg={s.colorBg}
                    >
                      {s.key === 'payments' && totalFromList > 0 && (() => {
                        const paid = Object.entries(paymentBreakdown).filter(([k]) => ['paid', 'success', 'completed'].includes(k)).reduce((a, [, v]) => a + v, 0)
                        const pending = Object.entries(paymentBreakdown).filter(([k]) => ['pending', 'awaiting'].includes(k)).reduce((a, [, v]) => a + v, 0)
                        const failed = Object.entries(paymentBreakdown).filter(([k]) => ['failed', 'cancelled', 'rejected'].includes(k)).reduce((a, [, v]) => a + v, 0)
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4ade80' }}>{paid}</Text>
                            {pending > 0 && (<><Text style={{ fontSize: 11, color: '#94a3b8' }}>/</Text><Text style={{ fontSize: 11, fontWeight: '700', color: '#facc15' }}>{pending}</Text></>)}
                            {failed > 0 && (<><Text style={{ fontSize: 11, color: '#94a3b8' }}>/</Text><Text style={{ fontSize: 11, fontWeight: '700', color: '#f87171' }}>{failed}</Text></>)}
                            <Text style={{ fontSize: 9, color: '#94a3b8', marginLeft: 3 }}>{'paid/pend' + (failed > 0 ? '/fail' : '')}</Text>
                          </View>
                        )
                      })()}
                    </StatCard>
                  </View>
                )
              })}
            </View>

            {/* Order status breakdown */}
            {Object.keys(orderBreakdown).length > 0 && (
              <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 20 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Order Status</Text>
                {Object.entries(orderBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const max = Math.max(...Object.values(orderBreakdown), 1)
                    const pct = (count / max) * 100
                    const barColor = getStatusColor(status)
                    return (
                      <View key={status} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>{status}</Text>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: barColor }}>{count}</Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: `${barColor}15`, borderRadius: 4 }}>
                          <View style={{ width: `${pct}%`, height: 8, backgroundColor: barColor, borderRadius: 4 }} />
                        </View>
                      </View>
                    )
                  })}
              </View>
            )}

            {/* Payment status breakdown */}
            {Object.keys(paymentBreakdown).length > 0 && (
              <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 20 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 16 }}>Payment Status</Text>
                {Object.entries(paymentBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const max = Math.max(...Object.values(paymentBreakdown), 1)
                    const pct = (count / max) * 100
                    const barColor = getStatusColor(status)
                    return (
                      <View key={status} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>{status}</Text>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: barColor }}>{count}</Text>
                        </View>
                        <View style={{ height: 8, backgroundColor: `${barColor}15`, borderRadius: 4 }}>
                          <View style={{ width: `${pct}%`, height: 8, backgroundColor: barColor, borderRadius: 4 }} />
                        </View>
                      </View>
                    )
                  })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
