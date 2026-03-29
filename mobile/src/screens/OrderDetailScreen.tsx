import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { Spacing, FontSize, BorderRadius } from '../constants/theme'
import { RefreshableScrollView, Badge, Card, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import type { OrdersStackParamList } from '../navigation'

interface Props {
  navigation: NativeStackNavigationProp<OrdersStackParamList, 'OrderDetail'>
  route: RouteProp<OrdersStackParamList, 'OrderDetail'>
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#FDCB6E', bg: '#FDCB6E18' },
  CONFIRMED: { color: '#74B9FF', bg: '#74B9FF18' },
  PREPARING: { color: '#A29BFE', bg: '#A29BFE18' },
  READY: { color: '#00B894', bg: '#00B89418' },
  COMPLETED: { color: '#00B894', bg: '#00B89418' },
  CANCELLED: { color: '#FF7675', bg: '#FF767518' },
  DELIVERED: { color: '#00B894', bg: '#00B89418' },
}

export function OrderDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { orderId } = route.params

  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api<any>(`/api/ordering/orders/${orderId}`)
      // Map Prisma snake_case fields to UI expectations
      setOrder({
        id: res.id,
        orderNumber: res.order_number ?? null,
        status: (res.status || '').toUpperCase(),
        totalAmount: res.total_kobo ?? res.totalAmount ?? res.total ?? 0,
        customer: res.customer,
        createdAt: res.created_at || res.createdAt,
        items: (res.orderItems || res.items || []).map((i: any) => ({
          id: i.id,
          name: i.menuItem?.name || i.name || 'Item',
          quantity: i.quantity,
          price: i.price_kobo ?? i.price ?? i.unitPrice ?? 0,
        })),
      })
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchOrder()
    setRefreshing(false)
  }

  function formatKobo(kobo: number) {
    return `₦${(kobo / 100).toLocaleString()}`
  }

  const sc = STATUS_COLORS[order?.status] || STATUS_COLORS.PENDING

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: colors.header,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text, flex: 1 }}>
          Order Details
        </Text>
      </View>

      <RefreshableScrollView refreshing={refreshing} onRefresh={handleRefresh}>
        <View style={{ padding: 20 }}>
          {isLoading ? (
            <View style={{ gap: 16 }}>
              <Card>
                <ShimmerRow width="50%" height={24} />
                <View style={{ height: 12 }} />
                <ShimmerRow width="70%" />
                <View style={{ height: 8 }} />
                <ShimmerRow width="40%" />
              </Card>
              <Card>
                {Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={{ paddingVertical: 8, gap: 6 }}>
                    <ShimmerRow width="60%" />
                    <ShimmerRow width="30%" height={12} />
                  </View>
                ))}
              </Card>
            </View>
          ) : !order ? (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, fontSize: FontSize.md, marginTop: 12 }}>
                  Order not found
                </Text>
              </View>
            </Card>
          ) : (
            <>
              {/* Order info */}
              <Card style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: colors.text }}>
                    #{order.orderNumber || order.id?.slice(0, 8)}
                  </Text>
                  <Badge label={order.status} color={sc.color} bgColor={sc.bg} />
                </View>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                    <Text style={{ fontSize: FontSize.md, color: colors.textSecondary }}>
                      {order.customer?.name || 'Customer'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                    <Text style={{ fontSize: FontSize.md, color: colors.textSecondary }}>
                      {order.customer?.phone || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                    <Text style={{ fontSize: FontSize.md, color: colors.textSecondary }}>
                      {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Items */}
              {order.items && order.items.length > 0 && (
                <Card style={{ marginBottom: 16, padding: 0 }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>Items</Text>
                  </View>
                  {order.items.map((item: any, idx: number) => (
                    <View
                      key={item.id || idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: idx < order.items.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FontSize.md, color: colors.text }}>
                          {item.name || item.menuItem?.name || 'Item'}
                        </Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                          x{item.quantity ?? 1}
                        </Text>
                      </View>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                        {formatKobo(item.price ?? item.unitPrice ?? 0)}
                      </Text>
                    </View>
                  ))}
                </Card>
              )}

              {/* Total */}
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: colors.textSecondary }}>Total</Text>
                  <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.primary }}>
                    {formatKobo(order.totalAmount ?? order.total ?? 0)}
                  </Text>
                </View>
              </Card>
            </>
          )}
        </View>
      </RefreshableScrollView>
    </View>
  )
}
