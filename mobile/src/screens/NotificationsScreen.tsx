import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'
import { useBadges } from '../contexts/BadgeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, BrandColors } from '../constants/theme'
import { EmptyState, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { HomeStackParamList } from '../navigation'

interface Notification {
  id: string
  title: string
  body: string
  type?: string
  read: boolean
  data?: string | null
  created_at: string
  createdAt?: string
}

interface Props {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Notifications'>
}

export function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const rootNav = useNavigation<any>()
  const { refresh: refreshBadges } = useBadges()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api<any>('/api/notifications')
      setNotifications(res?.items ?? res?.data ?? res ?? [])
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true)
    try {
      await api('/api/notifications/read-all', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      refreshBadges()
    } catch {
      Alert.alert('Error', 'Could not mark notifications as read')
    } finally {
      setIsMarkingAll(false)
    }
  }

  async function handleMarkOneRead(id: string) {
    try {
      await api(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      refreshBadges()
    } catch {
      // silent
    }
  }

  function handleNotificationTap(item: Notification) {
    if (!item.read) handleMarkOneRead(item.id)

    let parsed: any = {}
    if (item.data) {
      try { parsed = JSON.parse(item.data) } catch { /* ignore */ }
    }

    const typeUpper = (item.type || '').toUpperCase()

    if ((typeUpper.includes('ORDER') || typeUpper === 'PAYMENT') && parsed.orderId) {
      rootNav.navigate('Orders', { screen: 'OrderDetail', params: { orderId: parsed.orderId } })
    } else if (typeUpper.includes('ORDER')) {
      rootNav.navigate('Orders', { screen: 'OrdersList' })
    } else if (typeUpper === 'MESSAGE' || typeUpper === 'ESCALATION') {
      if (parsed.conversationId) {
        rootNav.navigate('Chats', {
          screen: 'Chat',
          params: { conversationId: parsed.conversationId, name: parsed.customerName || 'Customer', customerPhone: parsed.customerPhone },
        })
      } else {
        rootNav.navigate('Chats', { screen: 'ConversationsList' })
      }
    } else if (typeUpper === 'PAYMENT') {
      rootNav.navigate('Payments', { screen: 'PaymentsList' })
    }
  }

  function timeAgo(dateStr: string | undefined | null) {
    if (!dateStr) return ''
    const ts = new Date(dateStr).getTime()
    if (isNaN(ts)) return ''
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const ICON_MAP: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    ORDER: { icon: 'receipt', color: '#6C5CE7' },
    ORDER_NEW: { icon: 'receipt', color: '#6C5CE7' },
    ORDER_STATUS: { icon: 'receipt', color: '#6C5CE7' },
    PAYMENT: { icon: 'card', color: '#00B894' },
    MESSAGE: { icon: 'chatbubble', color: '#74B9FF' },
    ESCALATION: { icon: 'alert-circle', color: '#FF6B6B' },
    BOOKING: { icon: 'calendar', color: '#A29BFE' },
    BROADCAST: { icon: 'megaphone', color: '#FDCB6E' },
    ALERT: { icon: 'warning', color: '#E17055' },
  }

  const hasUnread = notifications.some(n => !n.read)

  function renderNotification({ item }: { item: Notification }) {
    const typeKey = (item.type || '').toUpperCase()
    const meta = ICON_MAP[typeKey] || { icon: 'notifications' as const, color: '#FDCB6E' }
    const timestamp = item.created_at || item.createdAt

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleNotificationTap(item)}
        style={{
          flexDirection: 'row',
          paddingHorizontal: 20,
          paddingVertical: 16,
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: item.read ? 'transparent' : `${colors.primary}08`,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: BorderRadius.md,
            backgroundColor: `${meta.color}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: item.read ? '500' : '700', color: colors.text, flex: 1 }} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginLeft: 8 }}>
              {timeAgo(timestamp)}
            </Text>
          </View>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4 }} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        {!item.read && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, alignSelf: 'center' }} />
        )}
      </TouchableOpacity>
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
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#FDCB6E20', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="notifications" size={16} color="#FDCB6E" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Notifications</Text>
        </View>
        {hasUnread && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={isMarkingAll}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.sm,
              backgroundColor: `${BrandColors.navyDark}15`,
            }}
          >
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: isMarkingAll ? colors.textMuted : colors.primary }}>
              {isMarkingAll ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <ShimmerRow width={40} height={40} />
              <View style={{ flex: 1, gap: 8 }}>
                <ShimmerRow width="70%" />
                <ShimmerRow width="90%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No notifications"
          subtitle="You'll see order updates, payment confirmations and messages here"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  )
}
