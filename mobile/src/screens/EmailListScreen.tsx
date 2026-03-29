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

interface EmailEntry {
  id: string
  email: string
  name?: string
  city?: string
  state?: string
  country?: string
  createdAt: string
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'EmailList'>
}

const PAGE_SIZE = 7

export function EmailListScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [entries, setEntries] = useState<EmailEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(0)

  const fetchEmails = useCallback(async () => {
    try {
      const res = await api<any>('/api/email-list')
      const raw = res?.data ?? res ?? []
      setEntries(raw.map((e: any) => ({
        id: e.id,
        email: e.email || '',
        name: e.name || '',
        city: e.city || '',
        state: e.state || '',
        country: e.country || '',
        createdAt: e.created_at || e.createdAt || '',
      })))
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    await fetchEmails()
    setRefreshing(false)
  }

  const totalPages = Math.ceil(entries.length / PAGE_SIZE)
  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function renderPagination() {
    if (totalPages <= 1) return null
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 16 }}>
        <TouchableOpacity
          disabled={page === 0}
          onPress={() => setPage(p => p - 1)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: page === 0 ? colors.surfaceElevated : colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={18} color={page === 0 ? colors.textMuted : '#fff'} />
        </TouchableOpacity>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>{page + 1} / {totalPages}</Text>
        <TouchableOpacity
          disabled={page >= totalPages - 1}
          onPress={() => setPage(p => p + 1)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: page >= totalPages - 1 ? colors.surfaceElevated : colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? colors.textMuted : '#fff'} />
        </TouchableOpacity>
      </View>
    )
  }

  function formatDate(d: string) {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d }
  }

  function renderEntry({ item }: { item: EmailEntry }) {
    const location = [item.city, item.state, item.country].filter(Boolean).join(', ')
    const initial = item.name ? item.name[0].toUpperCase() : item.email[0].toUpperCase()

    return (
      <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginHorizontal: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FDCB6E20', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#FDCB6E' }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {item.name ? (
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }} numberOfLines={1}>{item.name}</Text>
          ) : null}
          <Text style={{ fontSize: FontSize.sm, color: item.name ? colors.textSecondary : colors.text, marginTop: item.name ? 2 : 0, fontWeight: item.name ? '400' : '600' }} numberOfLines={1}>{item.email}</Text>
          {location ? (
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{location}</Text>
          ) : null}
        </View>
        {item.createdAt ? (
          <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{formatDate(item.createdAt)}</Text>
        ) : null}
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#FDCB6E20', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="mail" size={16} color="#FDCB6E" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Email List</Text>
        </View>
        {!isLoading && entries.length > 0 && (
          <View style={{ backgroundColor: `${colors.primary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>{entries.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <ShimmerRow width={44} height={44} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerRow width="60%" />
                <ShimmerRow width="80%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="mail-outline"
          title="No email subscribers"
          subtitle="Email addresses are collected automatically during checkout"
        />
      ) : (
        <FlatList
          data={pagedEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          ListFooterComponent={renderPagination}
        />
      )}
    </View>
  )
}
