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
import type { PaymentsStackParamList } from '../navigation'

interface Payment {
  id: string
  reference: string
  amount: number
  status: string
  provider?: string
  createdAt: string
  orderId?: string
  bookingId?: string
  customerName?: string | null
  customerPhone?: string | null
  orderStatus?: string | null
}

interface PaymentContact {
  id: string
  name: string
  phone: string
}

interface Props {
  navigation: NativeStackNavigationProp<PaymentsStackParamList, 'PaymentsList'>
}

const PAGE_SIZE = 5

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PAID: { color: '#00B894', bg: '#00B89418' },
  SUCCESS: { color: '#00B894', bg: '#00B89418' },
  SUCCESSFUL: { color: '#00B894', bg: '#00B89418' },
  PENDING: { color: '#FDCB6E', bg: '#FDCB6E18' },
  FAILED: { color: '#FF7675', bg: '#FF767518' },
  DECLINED: { color: '#FF7675', bg: '#FF767518' },
  CANCELLED: { color: '#636E72', bg: '#636E7218' },
}

export function PaymentsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [allPayments, setAllPayments] = useState<Payment[]>([])
  const [contacts, setContacts] = useState<PaymentContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)

  // Modal state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const fetchPayments = useCallback(async () => {
    try {
      const [res, contactRes] = await Promise.all([
        api<any>('/api/payments/list'),
        api<any>('/api/contacts').catch(() => []),
      ])
      const rawContacts = contactRes?.data ?? contactRes ?? []
      setContacts(rawContacts.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })))
      const raw = res?.data ?? res ?? []
      setAllPayments(raw.map((p: any) => ({
        id: p.id,
        reference: p.reference,
        amount: p.amount ?? 0,
        status: (p.status || '').toUpperCase(),
        provider: p.provider ?? 'paystack',
        createdAt: p.createdAt,
        orderId: p.orderId,
        bookingId: p.bookingId,
        customerName: p.customerName ?? null,
        customerPhone: p.customerPhone ?? null,
        orderStatus: p.orderStatus ?? null,
      })))
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    await fetchPayments()
    setRefreshing(false)
  }

  function displayName(payment: Payment): { name: string; isSaved: boolean } {
    if (payment.customerPhone) {
      const contact = contacts.find(c => c.phone === payment.customerPhone)
      if (contact?.name) return { name: contact.name, isSaved: true }
    }
    if (payment.customerName) return { name: payment.customerName, isSaved: false }
    return { name: (payment.provider || 'paystack').charAt(0).toUpperCase() + (payment.provider || 'paystack').slice(1), isSaved: false }
  }

  function formatKobo(kobo: number) {
    return `₦${(kobo / 100).toLocaleString()}`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  }

  function formatDateLong(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Pagination
  const totalPages = Math.ceil(allPayments.length / PAGE_SIZE)
  const pagedPayments = allPayments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function openPaymentModal(payment: Payment) {
    setSelectedPayment(payment)
    setModalVisible(true)
  }

  async function updateStatus(newStatus: string) {
    if (!selectedPayment || isUpdatingStatus) return
    setIsUpdatingStatus(true)
    try {
      await api(`/api/payments/${selectedPayment.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus.toLowerCase() },
      })
      const updated = { ...selectedPayment, status: newStatus }
      setSelectedPayment(updated)
      setAllPayments(prev => prev.map(p => p.id === updated.id ? updated : p))
    } catch {
      Alert.alert('Error', 'Failed to update payment status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  function renderPayment({ item }: { item: Payment }) {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING
    const { name: custName, isSaved } = displayName(item)

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openPaymentModal(item)}
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
                {item.reference?.slice(0, 12) || 'N/A'}
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
            {formatKobo(item.amount)}
          </Text>
        </View>
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

  const modalSc = STATUS_COLORS[selectedPayment?.status || 'PENDING'] || STATUS_COLORS.PENDING
  const isPending = selectedPayment?.status === 'PENDING'

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
                backgroundColor: `#FDCB6E20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="card" size={18} color="#FDCB6E" />
            </View>
            <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: colors.text }}>Payments</Text>
          </View>
          {!isLoading && allPayments.length > 0 && (
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>
              {allPayments.length} total
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
              <ShimmerRow width="40%" height={12} />
            </View>
          ))}
        </View>
      ) : allPayments.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title="No payments"
          subtitle="Payment records will appear here when customers make transactions"
        />
      ) : (
        <>
          <FlatList
            data={pagedPayments}
            keyExtractor={(item) => item.id}
            renderItem={renderPayment}
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

      {/* Payment Detail Modal */}
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
              Payment Details
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedPayment && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Status + Amount */}
              <Card style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Badge label={selectedPayment.status} color={modalSc.color} bgColor={modalSc.bg} />
                  <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.primary }}>
                    {formatKobo(selectedPayment.amount)}
                  </Text>
                </View>

                {/* Detail rows */}
                <View style={{ gap: 10 }}>
                  {/* Reference */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${BrandColors.navyDark}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="receipt-outline" size={16} color={BrandColors.navyDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Reference</Text>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                        {selectedPayment.reference}
                      </Text>
                    </View>
                  </View>

                  {/* Provider */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${BrandColors.orangeBold}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="wallet-outline" size={16} color={BrandColors.orangeBold} />
                    </View>
                    <View>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Provider</Text>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
                        {(selectedPayment.provider || 'paystack').charAt(0).toUpperCase() + (selectedPayment.provider || 'paystack').slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Customer */}
                  {(selectedPayment.customerName || selectedPayment.customerPhone) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `#00B89415`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person-outline" size={16} color="#00B894" />
                      </View>
                      <View>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Customer</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
                            {displayName(selectedPayment).name}
                          </Text>
                          {displayName(selectedPayment).isSaved && (
                            <View style={{ backgroundColor: '#00B89415', borderRadius: BorderRadius.full, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, fontWeight: '700', color: '#00B894' }}>SAVED</Text>
                            </View>
                          )}
                        </View>
                        {selectedPayment.customerPhone && (
                          <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>
                            {selectedPayment.customerPhone}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Linked Order */}
                  {selectedPayment.orderId && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `#6C5CE715`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="bag-outline" size={16} color="#6C5CE7" />
                      </View>
                      <View>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Linked Order</Text>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
                          #{selectedPayment.orderId.slice(0, 8)}
                          {selectedPayment.orderStatus ? ` • ${selectedPayment.orderStatus}` : ''}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Linked Booking */}
                  {selectedPayment.bookingId && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `#74B9FF15`, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="calendar-outline" size={16} color="#74B9FF" />
                      </View>
                      <View>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Linked Booking</Text>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
                          #{selectedPayment.bookingId.slice(0, 8)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Date */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${BrandColors.navyLight}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="time-outline" size={16} color={BrandColors.navyLight} />
                    </View>
                    <View>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Date</Text>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
                        {formatDateLong(selectedPayment.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>

              {/* Status Override — only for pending payments */}
              {isPending && (
                <Card style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                    Override Status
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginBottom: 14 }}>
                    Mark this pending payment as paid or declined
                  </Text>

                  {isUpdatingStatus ? (
                    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => updateStatus('PAID')}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 12,
                          borderRadius: BorderRadius.md,
                          backgroundColor: '#00B89418',
                          borderWidth: 1,
                          borderColor: '#00B89440',
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#00B894" />
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#00B894' }}>
                          Mark Paid
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => updateStatus('DECLINED')}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 12,
                          borderRadius: BorderRadius.md,
                          backgroundColor: '#FF767518',
                          borderWidth: 1,
                          borderColor: '#FF767540',
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color="#FF7675" />
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FF7675' }}>
                          Decline
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  )
}
