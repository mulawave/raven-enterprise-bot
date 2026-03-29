import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, BrandColors } from '../constants/theme'
import { Badge, Card, EmptyState, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Booking {
  id: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  date: string
  endDate?: string
  time?: string
  status: string
  service?: string
  notes?: string
  amount?: number
  paid?: boolean
  paymentChannel?: string
  transactionId?: string
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Bookings'>
}

const PAGE_SIZE = 4

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  CONFIRMED: { color: '#00B894', bg: '#00B89418' },
  PENDING: { color: '#FDCB6E', bg: '#FDCB6E18' },
  CANCELLED: { color: '#FF7675', bg: '#FF767518' },
  COMPLETED: { color: '#00B894', bg: '#00B89418' },
}

const MOCK_BOOKINGS: Booking[] = [
  { id: 'demo-1', customerName: 'Adaeze Okafor', customerPhone: '+234 812 345 6789', customerEmail: 'adaeze.ok@gmail.com', date: '2025-07-15T10:00:00Z', endDate: '2025-07-17T11:00:00Z', time: '10:00 AM', status: 'CONFIRMED', service: 'Deluxe Suite', amount: 4500000, paid: true, paymentChannel: 'Bank Transfer', transactionId: 'TXN-2025-A8F3K1', notes: 'Early check-in requested' },
  { id: 'demo-2', customerName: 'Emeka Nwosu', customerPhone: '+234 803 456 7890', date: '2025-07-16T14:00:00Z', endDate: '2025-07-18T12:00:00Z', time: '2:00 PM', status: 'PENDING', service: 'Standard Room', amount: 2500000, paid: false },
  { id: 'demo-3', customerName: 'Fatima Bello', customerPhone: '+234 909 234 5678', customerEmail: 'fatima.b@yahoo.com', date: '2025-07-17T12:00:00Z', endDate: '2025-07-20T11:00:00Z', time: '12:00 PM', status: 'COMPLETED', service: 'Executive Suite', amount: 7500000, paid: true, paymentChannel: 'Card Payment', transactionId: 'TXN-2025-C2D9M4', notes: 'VIP guest — extra amenities' },
  { id: 'demo-4', customerName: 'Chinedu Eze', customerPhone: '+234 816 789 0123', date: '2025-07-18T09:00:00Z', endDate: '2025-07-19T11:00:00Z', time: '9:00 AM', status: 'CANCELLED', service: 'Standard Room', amount: 2500000, paid: false },
  { id: 'demo-5', customerName: 'Blessing Adeyemi', customerPhone: '+234 705 678 9012', customerEmail: 'blessing.a@outlook.com', date: '2025-07-19T16:00:00Z', endDate: '2025-07-22T12:00:00Z', time: '4:00 PM', status: 'CONFIRMED', service: 'Deluxe Suite', amount: 4500000, paid: true, paymentChannel: 'Paystack', transactionId: 'TXN-2025-E7H2P6' },
  { id: 'demo-6', customerName: 'Ibrahim Yusuf', customerPhone: '+234 811 234 5678', customerEmail: 'ibrahim.y@corp.ng', date: '2025-07-20T11:00:00Z', endDate: '2025-07-24T11:00:00Z', time: '11:00 AM', status: 'PENDING', service: 'Presidential Suite', amount: 12000000, paid: false, notes: 'Corporate booking — invoice needed' },
  { id: 'demo-7', customerName: 'Ngozi Obi', customerPhone: '+234 802 345 6789', date: '2025-07-21T15:00:00Z', endDate: '2025-07-23T12:00:00Z', time: '3:00 PM', status: 'CONFIRMED', service: 'Standard Room', amount: 2500000, paid: true, paymentChannel: 'Cash', transactionId: 'RCP-2025-0721' },
  { id: 'demo-8', customerName: 'Oluwaseun Bakare', customerPhone: '+234 906 123 4567', customerEmail: 'seun.b@gmail.com', date: '2025-07-22T10:00:00Z', endDate: '2025-07-25T11:00:00Z', time: '10:00 AM', status: 'CONFIRMED', service: 'Executive Suite', amount: 7500000, paid: true, paymentChannel: 'Flutterwave', transactionId: 'TXN-2025-FW8K3Q' },
  { id: 'demo-9', customerName: 'Aisha Mohammed', customerPhone: '+234 813 987 6543', date: '2025-07-23T13:00:00Z', endDate: '2025-07-24T12:00:00Z', time: '1:00 PM', status: 'PENDING', service: 'Standard Room', amount: 2500000, paid: false, notes: 'Late arrival expected' },
]

export function BookingsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [page, setPage] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api<any>('/api/bookings')
      const raw = res?.data ?? res ?? []
      const mapped: Booking[] = raw.map((b: any) => ({
        id: b.id,
        customerName: b.customer?.name || b.customer?.phone || b.customerName,
        customerPhone: b.customer?.phone || b.customerPhone,
        customerEmail: b.customer?.email || null,
        date: b.start_date || b.date,
        endDate: b.end_date || null,
        time: null,
        status: (b.status || '').toUpperCase(),
        service: b.roomType?.name || b.service || null,
        amount: b.total_kobo || b.amount || null,
        paid: b.paid ?? null,
        paymentChannel: b.payment_channel || b.paymentChannel || null,
        transactionId: b.transaction_id || b.transactionId || null,
        notes: b.notes || null,
      }))
      if (mapped.length > 0) {
        setAllBookings(mapped)
        setIsDemo(false)
      } else {
        setAllBookings(MOCK_BOOKINGS)
        setIsDemo(true)
      }
    } catch {
      setAllBookings(MOCK_BOOKINGS)
      setIsDemo(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    await fetchBookings()
    setRefreshing(false)
  }

  function formatKobo(kobo: number) {
    return `₦${(kobo / 100).toLocaleString()}`
  }

  function formatDateFull(d: string) {
    return new Date(d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalPages = Math.ceil(allBookings.length / PAGE_SIZE)
  const pagedBookings = allBookings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function openDetail(booking: Booking) {
    setSelectedBooking(booking)
    setModalVisible(true)
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

  function renderBooking({ item }: { item: Booking }) {
    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.PENDING
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openDetail(item)}
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
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
              {item.customerName || item.customerPhone || 'Customer'}
            </Text>
            {item.service && (
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4 }}>
                {item.service}
              </Text>
            )}
          </View>
          <Badge label={item.status} color={sc.color} bgColor={sc.bg} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>
              {new Date(item.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          {item.time && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>{item.time}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          {item.amount ? (
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.primary }}>
              {formatKobo(item.amount)}
            </Text>
          ) : <View />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: item.paid ? '#00B894' : '#FF7675',
            }} />
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: item.paid ? '#00B894' : '#FF7675' }}>
              {item.paid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${BrandColors.navyDark}15`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={16} color={BrandColors.navyDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{label}</Text>
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>{value}</Text>
        </View>
      </View>
    )
  }

  const modalSc = STATUS_COLORS[selectedBooking?.status || 'PENDING'] || STATUS_COLORS.PENDING

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#A29BFE20', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar" size={16} color="#A29BFE" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Bookings</Text>
        </View>
        {!isLoading && allBookings.length > 0 && (
          <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>
              {allBookings.length}
            </Text>
          </View>
        )}
      </View>

      {/* Demo banner */}
      {isDemo && !isLoading && (
        <View style={{ marginHorizontal: 20, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#A29BFE15', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#A29BFE30', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="information-circle" size={18} color="#A29BFE" />
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, flex: 1 }}>
            Showing demo bookings. Real bookings will appear once customers start making reservations.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 8 }}>
              <ShimmerRow width="60%" />
              <ShimmerRow width="40%" height={12} />
              <ShimmerRow width="30%" height={12} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={pagedBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />
          }
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          ListFooterComponent={renderPagination}
        />
      )}

      {/* Booking Detail Modal */}
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
              Booking Details
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedBooking && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Status + Amount */}
              <Card style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Badge label={selectedBooking.status} color={modalSc.color} bgColor={modalSc.bg} />
                  {selectedBooking.amount ? (
                    <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.primary }}>
                      {formatKobo(selectedBooking.amount)}
                    </Text>
                  ) : null}
                </View>

                <DetailRow icon="person-outline" label="Customer" value={selectedBooking.customerName || 'Unknown'} />
                <DetailRow icon="call-outline" label="Phone" value={selectedBooking.customerPhone || 'N/A'} />
                {selectedBooking.customerEmail && (
                  <DetailRow icon="mail-outline" label="Email" value={selectedBooking.customerEmail} />
                )}
                {selectedBooking.service && (
                  <DetailRow icon="bed-outline" label="Room / Service" value={selectedBooking.service} />
                )}
              </Card>

              {/* Dates */}
              <Card style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 14 }}>
                  Stay Details
                </Text>
                <DetailRow icon="calendar-outline" label="Check-in" value={formatDateFull(selectedBooking.date)} />
                {selectedBooking.endDate && (
                  <DetailRow icon="calendar-outline" label="Check-out" value={formatDateFull(selectedBooking.endDate)} />
                )}
                {selectedBooking.time && (
                  <DetailRow icon="time-outline" label="Arrival Time" value={selectedBooking.time} />
                )}
                {selectedBooking.notes && (
                  <DetailRow icon="document-text-outline" label="Notes" value={selectedBooking.notes} />
                )}
              </Card>

              {/* Payment Info */}
              <Card style={{ marginBottom: 30 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 14 }}>
                  Payment Information
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: selectedBooking.paid ? '#00B89415' : '#FF767515', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={selectedBooking.paid ? 'checkmark-circle' : 'close-circle'} size={16} color={selectedBooking.paid ? '#00B894' : '#FF7675'} />
                  </View>
                  <View>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Payment Status</Text>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: selectedBooking.paid ? '#00B894' : '#FF7675' }}>
                      {selectedBooking.paid ? 'Paid' : 'Not Paid'}
                    </Text>
                  </View>
                </View>

                {selectedBooking.amount ? (
                  <DetailRow icon="cash-outline" label="Amount" value={formatKobo(selectedBooking.amount)} />
                ) : null}
                {selectedBooking.paymentChannel && (
                  <DetailRow icon="card-outline" label="Payment Channel" value={selectedBooking.paymentChannel} />
                )}
                {selectedBooking.transactionId && (
                  <DetailRow icon="receipt-outline" label="Transaction ID" value={selectedBooking.transactionId} />
                )}
                {!selectedBooking.paid && !selectedBooking.paymentChannel && (
                  <View style={{ backgroundColor: '#FDCB6E15', borderRadius: BorderRadius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="alert-circle" size={16} color="#FDCB6E" />
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, flex: 1 }}>
                      No payment has been recorded for this booking yet.
                    </Text>
                  </View>
                )}
              </Card>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  )
}
