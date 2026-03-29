import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { Spacing, FontSize, BorderRadius, BrandColors } from '../constants/theme'
import { EmptyState, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { ChatsStackParamList } from '../navigation'

interface Contact {
  id: string
  name: string
  phone: string
}

interface Conversation {
  id: string
  customerName: string
  customerPhone: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount?: number
  status: string
  botOverride?: boolean
}

interface Props {
  navigation: NativeStackNavigationProp<ChatsStackParamList, 'ConversationsList'>
}

export function ConversationsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      const [convRes, contactRes] = await Promise.all([
        api<any>('/api/messaging/conversations'),
        api<any>('/api/contacts').catch(() => []),
      ])
      setConversations(convRes?.data ?? convRes ?? [])
      const rawContacts = Array.isArray(contactRes) ? contactRes : (contactRes?.data ?? [])
      setContacts(rawContacts)
    } catch {
      // keep existing state
    } finally {
      setIsLoading(false)
    }
  }, [])

  function displayName(conv: Conversation): string {
    const contact = contacts.find((c: Contact) => c.phone === conv.customerPhone)
    return contact?.name ?? conv.customerName ?? conv.customerPhone
  }

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchConversations()
    setRefreshing(false)
  }

  function timeAgo(dateStr?: string) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  function renderConversation({ item }: { item: Conversation }) {
    const resolvedName = displayName(item)
    return (
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => navigation.navigate('Chat', { conversationId: item.id, name: resolvedName, customerPhone: item.customerPhone })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: `${colors.primary}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.primary }}>
            {(resolvedName || '?')[0].toUpperCase()}
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text, flexShrink: 1 }} numberOfLines={1}>
                {resolvedName}
              </Text>
              {item.botOverride && (
                <View style={{ backgroundColor: '#f59e0b20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#f59e0b' }}>YOU</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginLeft: 8 }}>
              {timeAgo(item.lastMessageAt)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {(item.unreadCount ?? 0) > 0 && (
              <View
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 6,
                  marginLeft: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  function renderShimmer() {
    return (
      <View style={{ padding: 20, gap: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <ShimmerRow width={48} height={48} />
            <View style={{ flex: 1, gap: 8 }}>
              <ShimmerRow width="60%" />
              <ShimmerRow width="80%" height={12} />
            </View>
          </View>
        ))}
      </View>
    )
  }

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: BorderRadius.md,
              backgroundColor: `#00B89420`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chatbubbles" size={18} color="#00B894" />
          </View>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: colors.text }}>Conversations</Text>
        </View>
      </View>

      {isLoading ? (
        renderShimmer()
      ) : conversations.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No conversations"
          subtitle="Customer conversations will appear here when they message your WhatsApp number"
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  )
}
