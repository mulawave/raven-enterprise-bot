import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { Spacing, FontSize, BorderRadius, BrandColors } from '../constants/theme'
import { Badge, EmptyState, ShimmerRow, Card } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { OrdersStackParamList } from '../navigation'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
}

interface Order {
  id: string
  orderNumber?: string
  status: string
  totalAmount?: number
  total?: number
  customer?: { name: string; phone: string }
  createdAt: string
  items: OrderItem[]
}

interface OrderContact {
  id: string
  name: string
  phone: string
}

interface Props {
  navigation: NativeStackNavigationProp<OrdersStackParamList, 'OrdersList'>
}

const PAGE_SIZE = 5

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PENDING: { color: '#FDCB6E', bg: '#FDCB6E18' },
  CONFIRMED: { color: '#74B9FF', bg: '#74B9FF18' },
  PREPARING: { color: '#A29BFE', bg: '#A29BFE18' },
  READY: { color: '#00B894', bg: '#00B89418' },
  COMPLETED: { color: '#00B894', bg: '#00B89418' },
  CANCELLED: { color: '#FF7675', bg: '#FF767518' },
  DELIVERED: { color: '#00B894', bg: '#00B89418' },
}

const ALL_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']

export function OrdersScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [contacts, setContacts] = useState<OrderContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      const [res, contactRes] = await Promise.all([
        api<any>('/api/ordering/orders'),
        api<any>('/api/contacts').catch(() => []),
      ])
      const rawContacts = contactRes?.data ?? contactRes ?? []
      setContacts(rawContacts.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })))
      const raw = res?.data ?? res ?? []
      setAllOrders(raw.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number ?? null,
        status: (o.status || '').toUpperCase(),
        totalAmount: o.total_kobo ?? o.totalAmount ?? o.total ?? 0,
        customer: o.customer,
        createdAt: o.created_at || o.createdAt,
        items: (o.orderItems || o.items || []).map((i: any) => ({
          id: i.id,
          name: i.menuItem?.name || i.name || 'Item',
          quantity: i.quantity ?? 1,
          price: i.price_kobo ?? i.price ?? 0,
        })),
      })))
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    await fetchOrders()
    setRefreshing(false)
  }

  function displayName(customer?: { name: string; phone: string }): { name: string; isSaved: boolean } {
    if (!customer) return { name: 'Unknown', isSaved: false }
    const contact = contacts.find(c => c.phone === customer.phone)
    if (contact?.name) return { name: contact.name, isSaved: true }
    if (customer.name) return { name: customer.name, isSaved: false }
    return { name: customer.phone || 'Unknown', isSaved: false }
  }

  function formatKobo(kobo: number) {
    return `₦${(kobo / 100).toLocaleString()}`
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDateLong(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Pagination
  const totalPages = Math.ceil(allOrders.length / PAGE_SIZE)
  const pagedOrders = allOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function openOrderModal(order: Order) {
    setSelectedOrder(order)
    setModalVisible(true)
  }

  async function updateStatus(newStatus: string) {
    if (!selectedOrder || isUpdatingStatus) return
    setIsUpdatingStatus(true)
    try {
      await api(`/api/ordering/orders/${selectedOrder.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus.toLowerCase() },
      })
      // Update local state
      const updated = { ...selectedOrder, status: newStatus }
      setSelectedOrder(updated)
      setAllOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    } catch {
      Alert.alert('Error', 'Failed to update order status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  function renderOrder({ item }: { item: Order }) {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING
    const { name: custName, isSaved } = displayName(item.customer)

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openOrderModal(item)}
        style={{
          backgroundColor: colors.card,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 16,
          marginHorizontal: 20,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text }}>
                #{item.orderNumber || item.id?.slice(0, 8)}
              </Text>
              <Badge label={item.status} color={sc.color} bgColor={sc.bg} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
                {custName} • {formatDate(item.createdAt)}
              </Text>
              {isSaved && (
                <View style={{ backgroundColor: '#00B89415', borderRadius: BorderRadius.full, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: '#00B894' }}>SAVED</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.primary }}>
            {formatKobo(item.totalAmount ?? item.total ?? 0)}
          </Text>
        </View>
        {item.items && item.items.length > 0 && (
          <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 8 }}>
            {item.items.length} item{item.items.length !== 1 ? 's' : ''}
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  function renderPagination() {
    if (totalPages <= 1) return null
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 16 }}>
        <TouchableOpacity
          disabled={page === 0}
          onPress={() => setPage(p => p - 1)}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: page === 0 ? colors.surfaceElevated : colors.primary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={18} color={page === 0 ? colors.textMuted : '#fff'} />
        </TouchableOpacity>

        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
          {page + 1} / {totalPages}
        </Text>

        <TouchableOpacity
          disabled={page >= totalPages - 1}
          onPress={() => setPage(p => p + 1)}
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: page >= totalPages - 1 ? colors.surfaceElevated : colors.primary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? colors.textMuted : '#fff'} />
        </TouchableOpacity>
      </View>
    )
  }

  const modalSc = STATUS_COLORS[selectedOrder?.status || 'PENDING'] || STATUS_COLORS.PENDING

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: BorderRadius.md,
                backgroundColor: `#6C5CE720`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="receipt" size={18} color="#6C5CE7" />
            </View>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: colors.text }}>Orders</Text>
          </View>
          {!isLoading && allOrders.length > 0 && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>
              {allOrders.length} total
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <ShimmerRow width="50%" />
                <ShimmerRow width={60} />
              </View>
              <ShimmerRow width="70%" height={12} />
            </View>
          ))}
        </View>
      ) : allOrders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No orders yet"
          subtitle="Orders placed by customers via WhatsApp will appear here"
        />
      ) : (
        <>
          <FlatList
            data={pagedOrders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrder}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.surface}
              />
            }
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
            ListFooterComponent={renderPagination}
          />
        </>
      )}

      {/* Order Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Modal header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 14,
            backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border,
          }}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>
              Order #{selectedOrder?.orderNumber || selectedOrder?.id?.slice(0, 8)}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Status + Total */}
              <Card style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Badge label={selectedOrder.status} color={modalSc.color} bgColor={modalSc.bg} />
                  <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.primary }}>
                    {formatKobo(selectedOrder.totalAmount ?? selectedOrder.total ?? 0)}
                  </Text>
                </View>

                {/* Customer info */}
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${BrandColors.navyDark}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="person-outline" size={16} color={BrandColors.navyDark} />
                    </View>
                    <View>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Customer</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                          {displayName(selectedOrder.customer).name}
                        </Text>
                        {displayName(selectedOrder.customer).isSaved && (
                          <View style={{ backgroundColor: '#00B89415', borderRadius: BorderRadius.full, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, fontWeight: '700', color: '#00B894' }}>SAVED</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${BrandColors.navyDark}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="call-outline" size={16} color={BrandColors.navyDark} />
                    </View>
                    <View>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Phone</Text>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                        {selectedOrder.customer?.phone || 'N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${BrandColors.navyDark}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="calendar-outline" size={16} color={BrandColors.navyDark} />
                    </View>
                    <View>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Date</Text>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                        {formatDateLong(selectedOrder.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>

              {/* Order items */}
              {selectedOrder.items.length > 0 && (
                <Card style={{ marginBottom: 16, padding: 0 }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text }}>
                      Items ordered
                    </Text>
                  </View>
                  {selectedOrder.items.map((item, idx) => (
                    <View
                      key={item.id || idx}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingHorizontal: 16, paddingVertical: 14,
                        borderBottomWidth: idx < selectedOrder.items.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FontSize.md, color: colors.text, fontWeight: '500' }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 }}>
                          x{item.quantity}
                        </Text>
                      </View>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                        {formatKobo(item.price * item.quantity)}
                      </Text>
                    </View>
                  ))}
                  {/* Total row */}
                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 14,
                    backgroundColor: `${colors.primary}08`,
                  }}>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text }}>Total</Text>
                    <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.primary }}>
                      {formatKobo(selectedOrder.totalAmount ?? selectedOrder.total ?? 0)}
                    </Text>
                  </View>
                </Card>
              )}

              {/* Status management */}
              <Card style={{ marginBottom: 30 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 14 }}>
                  Update Status
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ALL_STATUSES.map(status => {
                    const sc = STATUS_COLORS[status] || STATUS_COLORS.PENDING
                    const isActive = selectedOrder.status === status
                    return (
                      <TouchableOpacity
                        key={status}
                        disabled={isActive || isUpdatingStatus}
                        onPress={() => updateStatus(status)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: isActive ? sc.color : `${sc.color}18`,
                          borderWidth: 1,
                          borderColor: isActive ? sc.color : `${sc.color}40`,
                          opacity: isUpdatingStatus && !isActive ? 0.5 : 1,
                        }}
                      >
                        {isUpdatingStatus && isActive ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={{
                            fontSize: FontSize.xs,
                            fontWeight: '700',
                            color: isActive ? '#fff' : sc.color,
                          }}>
                            {status}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </Card>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  )
}
