import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius } from '../constants/theme'
import { EmptyState, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Customer {
  id: string
  name: string | null
  phone: string
  email?: string
  createdAt: string
  orderCount?: number
  bookingCount?: number
  totalPaid?: number
}

interface Contact {
  id: string
  name: string
  phone: string
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Customers'>
}

const PAGE_SIZE = 7

export function CustomersScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)

  const fetchCustomers = useCallback(async () => {
    try {
      const [custRes, contactRes, ordersRes] = await Promise.all([
        api<any>('/api/customers'),
        api<any>('/api/contacts').catch(() => []),
        api<any>('/api/ordering/orders').catch(() => []),
      ])
      // Build per-customer paid total from orders
      const rawOrders = ordersRes?.data ?? ordersRes ?? []
      const paidByCustomer: Record<string, number> = {}
      for (const o of rawOrders) {
        const cid = o.customer?.id
        if (cid) {
          const amt = o.total_kobo ?? o.totalAmount ?? o.total ?? 0
          paidByCustomer[cid] = (paidByCustomer[cid] || 0) + amt
        }
      }
      const raw = custRes?.data ?? custRes ?? []
      setAllCustomers(raw.map((c: any) => ({
        id: c.id,
        name: c.name || null,
        phone: c.phone || '',
        email: c.email || null,
        createdAt: c.created_at || c.createdAt,
        orderCount: c._count?.orders ?? c.orderCount ?? 0,
        bookingCount: c._count?.bookings ?? 0,
        totalPaid: paidByCustomer[c.id] ?? 0,
      })))
      const rawContacts = contactRes?.data ?? contactRes ?? []
      setContacts(rawContacts.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })))
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  function displayName(customer: Customer): { name: string; isSaved: boolean } {
    const contact = contacts.find(c => c.phone === customer.phone)
    if (contact?.name) return { name: contact.name, isSaved: true }
    if (customer.name) return { name: customer.name, isSaved: false }
    return { name: customer.phone || 'Unknown', isSaved: false }
  }

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    await fetchCustomers()
    setRefreshing(false)
  }

  const totalPages = Math.ceil(allCustomers.length / PAGE_SIZE)
  const pagedCustomers = allCustomers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

  function renderCustomer({ item }: { item: Customer }) {
    const { name: resolvedName, isSaved } = displayName(item)
    const initial = isSaved || item.name
      ? resolvedName[0].toUpperCase()
      : (item.phone ? item.phone.replace(/\D/g, '').slice(-1) : '?')

    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 16,
          marginHorizontal: 20,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: (isSaved || item.name) ? '#74B9FF20' : `${colors.textMuted}15`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {(isSaved || item.name) ? (
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#74B9FF' }}>
              {initial}
            </Text>
          ) : (
            <Ionicons name="person-outline" size={20} color={colors.textMuted} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {resolvedName}
            </Text>
            {isSaved && (
              <View style={{ backgroundColor: '#00B89415', borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#00B894' }}>SAVED</Text>
              </View>
            )}
          </View>
          {(isSaved || item.name) && item.phone ? (
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
              {item.phone}
            </Text>
          ) : item.email ? (
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
              {item.email}
            </Text>
          ) : !(isSaved || item.name) ? (
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' }}>
              No name saved
            </Text>
          ) : null}
        </View>
        {(item.orderCount ?? 0) > 0 && (
          <View
            style={{
              alignItems: 'flex-end',
              gap: 4,
            }}
          >
            <View
              style={{
                backgroundColor: `${colors.primary}15`,
                borderRadius: BorderRadius.full,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>
                {item.orderCount} order{item.orderCount !== 1 ? 's' : ''}
              </Text>
            </View>
            {(item.totalPaid ?? 0) > 0 && (
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#00B894' }}>
                ₦{((item.totalPaid ?? 0) / 100).toLocaleString()}
              </Text>
            )}
          </View>
        )}
      </View>
    )
  }

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
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#74B9FF20', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people" size={16} color="#74B9FF" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Customers</Text>
        </View>
        {!isLoading && allCustomers.length > 0 && (
          <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>
              {allCustomers.length}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <ShimmerRow width={44} height={44} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerRow width="60%" />
                <ShimmerRow width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : allCustomers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No customers"
          subtitle="Customer contacts will appear here as they interact with your business"
        />
      ) : (
        <FlatList
          data={pagedCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />
          }
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          ListFooterComponent={renderPagination}
        />
      )}
    </View>
  )
}
