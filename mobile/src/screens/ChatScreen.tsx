import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api, apiUpload } from '../lib/api'
import { Spacing, FontSize, BorderRadius, BrandColors } from '../constants/theme'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import type { ChatsStackParamList } from '../navigation'

interface MediaContent {
  __media: true
  type: string
  url: string
  filename: string
  caption?: string
}

interface Message {
  id: string
  content: string
  direction: 'INBOUND' | 'OUTBOUND'
  senderType?: string
  createdAt: string
  status?: string
  media?: MediaContent | null
}

interface SavedContact {
  id: string
  name: string
  phone: string
}

interface Props {
  navigation: NativeStackNavigationProp<ChatsStackParamList, 'Chat'>
  route: RouteProp<ChatsStackParamList, 'Chat'>
}

export function ChatScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const flatListRef = useRef<FlatList>(null)

  const { conversationId, name, customerPhone } = route.params
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [botOverride, setBotOverride] = useState(false)
  const [isTogglingBot, setIsTogglingBot] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Save contact state
  const [savedContact, setSavedContact] = useState<SavedContact | null>(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [contactName, setContactName] = useState('')
  const [isSavingContact, setIsSavingContact] = useState(false)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api<any>(`/api/messaging/conversations/${conversationId}/messages`)
      const raw = res?.data ?? res ?? []
      setMessages(raw.map((m: any) => {
        let media: MediaContent | null = null
        try {
          if (typeof m.content === 'string' && m.content.includes('"__media"')) {
            const parsed = JSON.parse(m.content)
            if (parsed.__media) media = parsed
          }
        } catch {}
        return {
          id: m.id,
          content: media ? (media.caption || `📎 ${media.filename || media.type}`) : m.content,
          direction: m.senderType === 'customer' ? 'INBOUND' as const : 'OUTBOUND' as const,
          senderType: m.senderType || m.sender_type,
          createdAt: m.createdAt || m.created_at,
          status: m.status,
          media,
        }
      }).reverse())
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  // Fetch bot override state
  const fetchOverrideState = useCallback(async () => {
    try {
      const convRes = await api<any>('/api/messaging/conversations')
      const convs = convRes?.data ?? convRes ?? []
      const thisConv = convs.find((c: any) => c.id === conversationId)
      if (thisConv) {
        setBotOverride(!!thisConv.botOverride)
      }
    } catch {}
  }, [conversationId])

  // Fetch contacts to check if already saved
  const fetchContactStatus = useCallback(async () => {
    if (!customerPhone) return
    try {
      const res = await api<any>('/api/contacts')
      const raw = res?.data ?? res ?? []
      const match = raw.find((c: any) => c.phone === customerPhone)
      if (match) setSavedContact({ id: match.id, name: match.name, phone: match.phone })
      else setSavedContact(null)
    } catch {}
  }, [customerPhone])

  useEffect(() => {
    fetchMessages()
    fetchOverrideState()
    fetchContactStatus()
  }, [fetchMessages, fetchOverrideState, fetchContactStatus])

  // Auto-refresh messages every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages()
      fetchOverrideState()
    }, 8000)
    return () => clearInterval(interval)
  }, [fetchMessages, fetchOverrideState])

  async function toggleBotOverride() {
    if (isTogglingBot) return
    setIsTogglingBot(true)
    try {
      await api(`/api/messaging/conversations/${conversationId}/override`, {
        method: 'PATCH',
        body: { override: !botOverride },
      })
      setBotOverride(!botOverride)
    } catch {
      Alert.alert('Error', 'Failed to toggle bot. Try again.')
    } finally {
      setIsTogglingBot(false)
    }
  }

  async function handleSaveContact() {
    if (!contactName.trim() || !customerPhone) return
    setIsSavingContact(true)
    try {
      await api('/api/contacts', {
        method: 'POST',
        body: { name: contactName.trim(), phone: customerPhone },
      })
      setShowSaveForm(false)
      setContactName('')
      await fetchContactStatus()
      Alert.alert('Saved', 'Contact saved successfully')
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to save contact'
      Alert.alert('Error', msg.includes('unique') ? 'Contact already exists for this number' : msg)
    } finally {
      setIsSavingContact(false)
    }
  }

  async function handleSend() {
    if (!text.trim() || isSending) return
    const msg = text.trim()
    setText('')
    setIsSending(true)
    try {
      await api(`/api/messaging/conversations/${conversationId}/send`, {
        method: 'POST',
        body: { message: msg },
      })
      // Sending auto-enables bot override on backend
      setBotOverride(true)
      await fetchMessages()
    } catch {
      setText(msg) // restore on failure
    } finally {
      setIsSending(false)
    }
  }

  async function handlePickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsMultipleSelection: false,
      })
      if (result.canceled || !result.assets?.[0]) return

      const asset = result.assets[0]
      await uploadFile(asset.uri, asset.fileName || 'image.jpg', asset.mimeType || 'image/jpeg')
    } catch {
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  async function handlePickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets?.[0]) return

      const asset = result.assets[0]
      await uploadFile(asset.uri, asset.name || 'document', asset.mimeType || 'application/octet-stream')
    } catch {
      Alert.alert('Error', 'Failed to pick document')
    }
  }

  async function uploadFile(uri: string, filename: string, mimeType: string) {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as any)

      await apiUpload(
        `/api/messaging/conversations/${conversationId}/send-media`,
        formData,
      )
      setBotOverride(true)
      await fetchMessages()
    } catch {
      Alert.alert('Error', 'Failed to send file. Check file size (max 16MB).')
    } finally {
      setIsUploading(false)
    }
  }

  function showAttachMenu() {
    Alert.alert('Send Media', 'Choose what to send', [
      { text: 'Photo / Video', onPress: handlePickImage },
      { text: 'Document', onPress: handlePickDocument },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function renderMessage({ item }: { item: Message }) {
    const isOutbound = item.direction === 'OUTBOUND'
    const isBot = item.senderType === 'bot'
    const isHuman = item.senderType === 'human'

    return (
      <View
        style={{
          alignSelf: isOutbound ? 'flex-end' : 'flex-start',
          maxWidth: '78%',
          marginHorizontal: 16,
          marginVertical: 2,
        }}
      >
        {/* Sender label for outbound messages */}
        {isOutbound && (
          <Text style={{ fontSize: 9, color: isBot ? '#60a5fa' : '#4ade80', alignSelf: 'flex-end', marginBottom: 2, marginRight: 4 }}>
            {isBot ? '🤖 Bot' : isHuman ? '👤 You' : ''}
          </Text>
        )}

        {/* Media preview */}
        {item.media && item.media.type?.startsWith('image') && (
          <View style={{ marginBottom: 4, borderRadius: 14, overflow: 'hidden' }}>
            <Image
              source={{ uri: item.media.url }}
              style={{ width: 220, height: 180, borderRadius: 14 }}
              resizeMode="cover"
            />
          </View>
        )}

        <View
          style={{
            backgroundColor: isOutbound
              ? (isBot ? '#3b82f620' : colors.primary)
              : colors.surfaceElevated,
            borderRadius: 18,
            borderTopRightRadius: isOutbound ? 4 : 18,
            borderTopLeftRadius: isOutbound ? 18 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: isBot ? 1 : 0,
            borderColor: isBot ? '#3b82f640' : 'transparent',
          }}
        >
          <Text style={{
            fontSize: FontSize.md,
            color: isOutbound ? (isBot ? colors.text : '#fff') : colors.text,
            lineHeight: 22,
          }}>
            {item.content}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: isOutbound
                ? (isBot ? colors.textMuted : 'rgba(255,255,255,0.6)')
                : colors.textMuted,
              alignSelf: 'flex-end',
              marginTop: 4,
            }}
          >
            {formatTime(item.createdAt)}
            {isOutbound && item.status === 'delivered' && ' ✓✓'}
            {isOutbound && item.status === 'sent' && ' ✓'}
          </Text>
        </View>
      </View>
    )
  }

  const isBusy = isSending || isUploading
  const headerName = savedContact?.name || name

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
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
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${colors.primary}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.primary }}>
            {headerName[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }} numberOfLines={1}>
              {headerName}
            </Text>
            {savedContact && (
              <View style={{ backgroundColor: '#6C5CE715', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#6C5CE7' }}>★ SAVED</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>WhatsApp</Text>
        </View>
        {!savedContact && customerPhone && (
          <TouchableOpacity
            onPress={() => setShowSaveForm(!showSaveForm)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: '#00B89418', borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 6,
              borderWidth: 1, borderColor: '#00B89430',
            }}
          >
            <Ionicons name="person-add" size={14} color="#00B894" />
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: '#00B894' }}>Save</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Save contact inline form */}
      {showSaveForm && !savedContact && customerPhone && (
        <View style={{ backgroundColor: '#00B89410', borderBottomWidth: 1, borderBottomColor: '#00B89430', padding: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Ionicons name="person-add" size={14} color="#00B894" />
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: '#00B894' }}>Save as contact</Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>({customerPhone})</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="e.g. John Adeyemi"
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={{ flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border }}
            />
            <TouchableOpacity
              disabled={isSavingContact || !contactName.trim()}
              onPress={handleSaveContact}
              style={{ backgroundColor: '#00B894', borderRadius: BorderRadius.sm, paddingHorizontal: 16, justifyContent: 'center', opacity: isSavingContact || !contactName.trim() ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.sm }}>{isSavingContact ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowSaveForm(false); setContactName('') }} style={{ padding: 10, justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bot override banner */}
      <TouchableOpacity
        onPress={toggleBotOverride}
        disabled={isTogglingBot}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: botOverride ? '#f59e0b18' : `${BrandColors.navyDark}12`,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {isTogglingBot ? (
          <ActivityIndicator size="small" color={botOverride ? '#f59e0b' : BrandColors.navyDark} />
        ) : (
          <Ionicons
            name={botOverride ? 'person' : 'hardware-chip'}
            size={16}
            color={botOverride ? '#f59e0b' : BrandColors.navyDark}
          />
        )}
        <Text style={{
          fontSize: FontSize.xs,
          fontWeight: '600',
          color: botOverride ? '#f59e0b' : BrandColors.navyDark,
        }}>
          {botOverride
            ? 'You are managing this chat · Tap to re-enable bot'
            : 'Bot is replying · Tap to take over'}
        </Text>
      </TouchableOpacity>

      {/* Messages */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingVertical: 10,
          paddingBottom: insets.bottom + 10,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: 8,
        }}
      >
        {/* Attach button */}
        <TouchableOpacity
          onPress={showAttachMenu}
          disabled={isBusy}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="attach" size={22} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {/* Text input */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: Platform.OS === 'ios' ? 10 : 4,
            maxHeight: 100,
          }}
        >
          <TextInput
            style={{ color: colors.text, fontSize: FontSize.md }}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!isBusy}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || isBusy}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: text.trim() ? colors.primary : colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color={text.trim() ? '#fff' : colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
