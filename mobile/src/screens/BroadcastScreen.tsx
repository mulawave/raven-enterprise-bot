import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { Spacing, FontSize, BorderRadius } from '../constants/theme'
import { Card } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

const MAX_CHARS = 1024

interface BroadcastResult {
  sent: number
  failed: number
  total: number
}

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' as const, color: '#25D366', enabled: true },
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram' as const, color: '#E1306C', enabled: false },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook' as const, color: '#1877F2', enabled: false },
]

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Broadcast'>
}

export function BroadcastScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<BroadcastResult | null>(null)

  const remaining = MAX_CHARS - message.length
  const charColor = remaining <= 0 ? '#FF7675' : remaining <= 50 ? '#FDCB6E' : colors.textMuted

  function confirmSend() {
    if (!message.trim()) return
    Alert.alert(
      'Confirm Broadcast',
      `Send this message via ${CHANNELS.find(c => c.id === channel)?.label} to all contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: handleSend },
      ],
    )
  }

  async function handleSend() {
    if (!message.trim()) return
    setIsSending(true)
    setResult(null)
    try {
      const res = await api<any>('/api/broadcast/send', {
        method: 'POST',
        body: { channel, message: message.trim() },
      })
      const data = res?.data ?? res ?? {}
      const broadcastResult: BroadcastResult = {
        sent: data.sent ?? 0,
        failed: data.failed ?? 0,
        total: data.total ?? 0,
      }
      setResult(broadcastResult)
      setMessage('')
    } catch (err: any) {
      Alert.alert('Error', err?.data?.message || err?.message || 'Failed to send broadcast')
    } finally {
      setIsSending(false)
    }
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
            <Ionicons name="megaphone" size={16} color="#FDCB6E" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Broadcast</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        {/* Result banner */}
        {result && (
          <View
            style={{
              backgroundColor: result.failed > 0 ? '#FDCB6E15' : '#00B89415',
              borderWidth: 1,
              borderColor: result.failed > 0 ? '#FDCB6E40' : '#00B89440',
              borderRadius: BorderRadius.lg,
              padding: 16,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 40, height: 40, borderRadius: BorderRadius.md,
                backgroundColor: result.failed > 0 ? '#FDCB6E20' : '#00B89420',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons
                name={result.failed > 0 ? 'warning' : 'checkmark-circle'}
                size={20}
                color={result.failed > 0 ? '#FDCB6E' : '#00B894'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text }}>
                Broadcast Complete
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
                {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ''} — {result.total} total
              </Text>
            </View>
            <TouchableOpacity onPress={() => setResult(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Info card */}
        <Card style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 40, height: 40, borderRadius: BorderRadius.md,
                backgroundColor: '#FDCB6E20', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="information-circle" size={20} color="#FDCB6E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                Send broadcast message
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4, lineHeight: 20 }}>
                This message will be sent to all your saved contacts via the selected channel. Use responsibly to avoid being flagged as spam.
              </Text>
            </View>
          </View>
        </Card>

        {/* Channel selector */}
        <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
          Channel
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {CHANNELS.map(ch => {
            const isActive = channel === ch.id
            return (
              <TouchableOpacity
                key={ch.id}
                onPress={() => ch.enabled && setChannel(ch.id)}
                disabled={!ch.enabled}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: BorderRadius.md,
                  backgroundColor: isActive ? `${ch.color}15` : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? `${ch.color}50` : colors.border,
                  alignItems: 'center',
                  gap: 4,
                  opacity: ch.enabled ? 1 : 0.45,
                }}
              >
                <Ionicons name={ch.icon} size={20} color={isActive ? ch.color : colors.textSecondary} />
                <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: isActive ? ch.color : colors.textSecondary }}>
                  {ch.label}
                </Text>
                {!ch.enabled && (
                  <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '600' }}>Coming Soon</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Message input */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            Message
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: remaining <= 50 && message.length > 0 ? '#FDCB6E60' : colors.border,
              padding: 16,
              color: colors.text,
              fontSize: FontSize.md,
              minHeight: 140,
              textAlignVertical: 'top',
            }}
            value={message}
            onChangeText={(t) => setMessage(t.slice(0, MAX_CHARS))}
            placeholder="Type your broadcast message here…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_CHARS}
            editable={!isSending}
          />
          <Text style={{ fontSize: FontSize.xs, color: charColor, marginTop: 6, textAlign: 'right', fontWeight: remaining <= 50 && message.length > 0 ? '700' : '400' }}>
            {message.length}/{MAX_CHARS}
          </Text>
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={confirmSend}
          disabled={isSending || !message.trim()}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#FDCB6E',
            height: 52,
            borderRadius: BorderRadius.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSending || !message.trim() ? 0.5 : 1,
            gap: 8,
          }}
        >
          {isSending ? (
            <>
              <ActivityIndicator size="small" color="#1a1a2e" />
              <Text style={{ color: '#1a1a2e', fontSize: FontSize.md, fontWeight: '700' }}>Sending…</Text>
            </>
          ) : (
            <>
              <Ionicons name="send" size={18} color="#1a1a2e" />
              <Text style={{ color: '#1a1a2e', fontSize: FontSize.md, fontWeight: '700' }}>Send Broadcast</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
