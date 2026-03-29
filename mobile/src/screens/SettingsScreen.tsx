import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, TextInput, Image, RefreshControl } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, Spacing } from '../constants/theme'
import { APP_VERSION, API_BASE_URL } from '../constants/config'
import { Card, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Settings'>
}

interface BrandingData {
  businessName: string
  logoUrl: string
  primaryColor: string
  whatsappNumber: string
}

interface KeyInfo {
  key: string
  has_value: boolean
  value: string
}

interface DebugInfo {
  conversations: number
  openConversations: number
  messages: number
  lastMessageAt: string | null
  lastMessagePreview: string | null
}

interface DeletionRequest {
  id: string
  identifier: string
  identifier_type: string
  status: string
  source: string
  requested_at: string
}

const API_KEY_FIELDS = [
  { key: 'META_APP_SECRET', label: 'Meta App Secret', hint: 'From Meta for Developers → App Settings' },
  { key: 'META_WEBHOOK_VERIFY_TOKEN', label: 'Webhook Verify Token', hint: 'User-chosen string for webhook' },
  { key: 'META_ACCESS_TOKEN', label: 'Meta Access Token', hint: 'From WhatsApp → API Setup' },
  { key: 'META_PHONE_NUMBER_ID', label: 'Phone Number ID', hint: 'Numeric ID from WhatsApp API' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', hint: 'From platform.openai.com (optional)' },
]

export function SettingsScreen({ navigation }: Props) {
  const { colors, isDark, toggle } = useTheme()
  const { session, logout } = useAuth()
  const insets = useSafeAreaInsets()

  // Branding state
  const [branding, setBranding] = useState<BrandingData | null>(null)
  const [editBranding, setEditBranding] = useState<BrandingData | null>(null)
  const [isSavingBranding, setIsSavingBranding] = useState(false)
  const [brandingDirty, setBrandingDirty] = useState(false)

  // API Keys state
  const [keys, setKeys] = useState<KeyInfo[]>([])
  const [keyEdits, setKeyEdits] = useState<Record<string, string>>({})
  const [keyVisible, setKeyVisible] = useState<Record<string, boolean>>({})
  const [isSavingKeys, setIsSavingKeys] = useState(false)

  // Connection / debug state
  const [debug, setDebug] = useState<DebugInfo | null>(null)

  // Data privacy state
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([])
  const [delIdentifier, setDelIdentifier] = useState('')
  const [delType, setDelType] = useState<'phone' | 'email'>('phone')
  const [isSubmittingDel, setIsSubmittingDel] = useState(false)
  const [processingDelId, setProcessingDelId] = useState<string | null>(null)

  // Loading
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Collapsed sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    account: true,
    branding: false,
    keys: false,
    connection: false,
    preferences: true,
    privacy: false,
    about: false,
  })

  function toggleSection(key: string) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const fetchAll = useCallback(async () => {
    try {
      const [ctxRes, keysRes, debugRes, delRes] = await Promise.all([
        api<any>('/tenant/context').catch(() => null),
        api<any>('/api/settings/keys').catch(() => []),
        api<any>('/api/messaging/debug').catch(() => null),
        api<any>('/api/data-deletion').catch(() => []),
      ])

      if (ctxRes) {
        const b = ctxRes.branding ?? ctxRes.data?.branding ?? {}
        const bd: BrandingData = {
          businessName: b.businessName || b.business_name || '',
          logoUrl: b.logoUrl || b.logo_url || '',
          primaryColor: b.primaryColor || b.primary_color || '#0ea5e9',
          whatsappNumber: b.whatsappNumber || b.whatsapp_number || '',
        }
        setBranding(bd)
        setEditBranding(bd)
      }

      const rawKeys = keysRes?.data ?? keysRes ?? []
      if (Array.isArray(rawKeys)) setKeys(rawKeys)

      const rawDebug = debugRes?.data ?? debugRes
      if (rawDebug) {
        setDebug({
          conversations: rawDebug.conversations ?? 0,
          openConversations: rawDebug.openConversations ?? rawDebug.open_conversations ?? 0,
          messages: rawDebug.messages ?? 0,
          lastMessageAt: rawDebug.lastMessageAt ?? rawDebug.last_message_at ?? null,
          lastMessagePreview: rawDebug.lastMessagePreview ?? rawDebug.last_message_preview ?? null,
        })
      }

      const rawDel = delRes?.data ?? delRes ?? []
      if (Array.isArray(rawDel)) {
        setDeletionRequests(rawDel.map((d: any) => ({
          id: d.id,
          identifier: d.identifier || '',
          identifier_type: d.identifier_type || 'phone',
          status: d.status || 'pending',
          source: d.source || '',
          requested_at: d.requested_at || d.requestedAt || '',
        })))
      }
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }

  // --- Branding ---
  function updateBrandingField(field: keyof BrandingData, value: string) {
    if (!editBranding) return
    const updated = { ...editBranding, [field]: value }
    setEditBranding(updated)
    setBrandingDirty(
      updated.businessName !== (branding?.businessName ?? '') ||
      updated.primaryColor !== (branding?.primaryColor ?? '') ||
      updated.whatsappNumber !== (branding?.whatsappNumber ?? '')
    )
  }

  async function handleSaveBranding() {
    if (!editBranding || !brandingDirty) return
    setIsSavingBranding(true)
    try {
      await api('/tenant/branding', {
        method: 'POST',
        body: {
          businessName: editBranding.businessName.trim(),
          primaryColor: editBranding.primaryColor.trim(),
          whatsappNumber: editBranding.whatsappNumber.trim(),
        },
      })
      setBranding(editBranding)
      setBrandingDirty(false)
      Alert.alert('Saved', 'Branding updated')
    } catch {
      Alert.alert('Error', 'Failed to save branding')
    } finally {
      setIsSavingBranding(false)
    }
  }

  // --- API Keys ---
  function updateKeyEdit(key: string, value: string) {
    setKeyEdits(prev => ({ ...prev, [key]: value }))
  }

  function toggleKeyVisibility(key: string) {
    setKeyVisible(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function getKeyStatus(key: string): 'configured' | 'not_set' | 'changed' {
    const info = keys.find(k => k.key === key)
    const original = info?.value ?? ''
    if (keyEdits[key] !== undefined && keyEdits[key] !== original) return 'changed'
    return info?.has_value ? 'configured' : 'not_set'
  }

  async function handleSaveKeys() {
    const changed = Object.entries(keyEdits).filter(([k, v]) => {
      const original = keys.find(ki => ki.key === k)?.value ?? ''
      return v !== original && v.length > 0
    })
    if (changed.length === 0) {
      Alert.alert('No changes', 'Enter new values before saving')
      return
    }
    setIsSavingKeys(true)
    try {
      await api('/api/settings/keys', {
        method: 'POST',
        body: { keys: changed.map(([key, value]) => ({ key, value })) },
      })
      setKeyEdits({})
      Alert.alert('Saved', `${changed.length} key${changed.length > 1 ? 's' : ''} updated`)
      // Refresh keys
      const keysRes = await api<any>('/api/settings/keys').catch(() => [])
      const rawKeys = keysRes?.data ?? keysRes ?? []
      if (Array.isArray(rawKeys)) setKeys(rawKeys)
    } catch {
      Alert.alert('Error', 'Failed to save keys')
    } finally {
      setIsSavingKeys(false)
    }
  }

  // --- Data Privacy ---
  async function handleSubmitDeletion() {
    if (!delIdentifier.trim()) return
    setIsSubmittingDel(true)
    try {
      await api('/api/data-deletion', {
        method: 'POST',
        body: { identifier: delIdentifier.trim(), identifierType: delType },
      })
      setDelIdentifier('')
      Alert.alert('Submitted', 'Deletion request created')
      const delRes = await api<any>('/api/data-deletion').catch(() => [])
      const rawDel = delRes?.data ?? delRes ?? []
      if (Array.isArray(rawDel)) {
        setDeletionRequests(rawDel.map((d: any) => ({
          id: d.id, identifier: d.identifier || '', identifier_type: d.identifier_type || 'phone',
          status: d.status || 'pending', source: d.source || '', requested_at: d.requested_at || d.requestedAt || '',
        })))
      }
    } catch {
      Alert.alert('Error', 'Failed to submit request')
    } finally {
      setIsSubmittingDel(false)
    }
  }

  async function handleProcessDeletion(id: string) {
    Alert.alert('Erase Data', 'This will permanently delete all customer data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase', style: 'destructive', onPress: async () => {
          setProcessingDelId(id)
          try {
            await api(`/api/data-deletion/${id}/process`, { method: 'POST' })
            Alert.alert('Done', 'Data erased')
            await handleRefresh()
          } catch {
            Alert.alert('Error', 'Failed to erase data')
          } finally {
            setProcessingDelId(null)
          }
        },
      },
    ])
  }

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ])
  }

  function formatDate(d: string) {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d }
  }

  function formatTime(d: string) {
    if (!d) return '—'
    try { return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return d }
  }

  const resolvedLogoUrl = editBranding?.logoUrl
    ? (editBranding.logoUrl.startsWith('http') ? editBranding.logoUrl : `${API_BASE_URL}${editBranding.logoUrl}`)
    : null

  const tenantId = (session as any)?.tenant?.id || ''
  const selfServiceUrl = `https://app.raven-ai.online/data-deletion?t=${tenantId}`

  // --- Section Header component ---
  function SectionHead({ title, icon, iconColor, iconBg, sectionKey }: { title: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string; sectionKey: string }) {
    const expanded = expandedSections[sectionKey]
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleSection(sectionKey)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: expanded ? 12 : 0, marginTop: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={14} color={iconColor} />
          </View>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>
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
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#63727220', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings" size={16} color="#636E72" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>Settings</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ─── ACCOUNT ───────────────────────────────────────────── */}
        <SectionHead title="Account" icon="person" iconColor="#74B9FF" iconBg="#74B9FF20" sectionKey="account" />
        {expandedSections.account && (
          <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Name</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text, marginTop: 4 }}>{session?.user?.name || 'N/A'}</Text>
            </View>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Email</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text, marginTop: 4 }}>{session?.user?.email || 'N/A'}</Text>
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Role</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text, marginTop: 4 }}>{session?.user?.role || 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* ─── BRANDING ──────────────────────────────────────────── */}
        <SectionHead title="Branding" icon="color-palette" iconColor="#6C5CE7" iconBg="#6C5CE720" sectionKey="branding" />
        {expandedSections.branding && (
          <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 16, gap: 12 }}>
            {isLoading ? (
              <View style={{ gap: 12 }}><ShimmerRow width="60%" /><ShimmerRow width="80%" /><ShimmerRow width="40%" /></View>
            ) : (
              <>
                {/* Logo preview */}
                {resolvedLogoUrl && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <Image source={{ uri: resolvedLogoUrl }} style={{ width: 56, height: 56, borderRadius: 12 }} resizeMode="cover" />
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Current logo</Text>
                  </View>
                )}
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginBottom: 4 }}>Business Name</Text>
                  <TextInput
                    value={editBranding?.businessName ?? ''}
                    onChangeText={v => updateBrandingField('businessName', v)}
                    placeholder="Your business name"
                    placeholderTextColor={colors.textMuted}
                    style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: colors.border }}
                  />
                </View>
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginBottom: 4 }}>Primary Color</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: editBranding?.primaryColor || '#0ea5e9', borderWidth: 1, borderColor: colors.border }} />
                    <TextInput
                      value={editBranding?.primaryColor ?? ''}
                      onChangeText={v => updateBrandingField('primaryColor', v)}
                      placeholder="#0ea5e9"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      style={{ flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border }}
                    />
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginBottom: 4 }}>WhatsApp Number</Text>
                  <TextInput
                    value={editBranding?.whatsappNumber ?? ''}
                    onChangeText={v => updateBrandingField('whatsappNumber', v)}
                    placeholder="+234XXXXXXXXXX"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: colors.border }}
                  />
                </View>
                {brandingDirty && (
                  <TouchableOpacity
                    disabled={isSavingBranding}
                    onPress={handleSaveBranding}
                    style={{ backgroundColor: colors.primary, borderRadius: BorderRadius.sm, padding: 12, alignItems: 'center', opacity: isSavingBranding ? 0.5 : 1 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.md }}>{isSavingBranding ? 'Saving…' : 'Save Branding'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* ─── API KEYS ──────────────────────────────────────────── */}
        <SectionHead title="WhatsApp & AI Keys" icon="key" iconColor="#FDCB6E" iconBg="#FDCB6E20" sectionKey="keys" />
        {expandedSections.keys && (
          <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 16, gap: 12 }}>
            {isLoading ? (
              <View style={{ gap: 12 }}>{Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} width="100%" height={14} />)}</View>
            ) : (
              <>
                {API_KEY_FIELDS.map(field => {
                  const status = getKeyStatus(field.key)
                  const statusC = status === 'configured' ? '#00B894' : status === 'changed' ? '#74B9FF' : '#FDCB6E'
                  const statusLabel = status === 'configured' ? 'Configured' : status === 'changed' ? 'Will update' : 'Not set'
                  const visible = keyVisible[field.key]

                  return (
                    <View key={field.key}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, flex: 1 }} numberOfLines={1}>{field.label}</Text>
                        <View style={{ backgroundColor: `${statusC}18`, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: statusC }}>{statusLabel}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TextInput
                          key={`${field.key}_${visible ? 'v' : 'h'}`}
                          value={keyEdits[field.key] ?? keys.find(k => k.key === field.key)?.value ?? ''}
                          onChangeText={v => updateKeyEdit(field.key, v)}
                          placeholder={field.hint}
                          placeholderTextColor={colors.textMuted}
                          secureTextEntry={!visible}
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: status === 'changed' ? '#74B9FF' : colors.border }}
                        />
                        <TouchableOpacity
                          onPress={() => toggleKeyVisibility(field.key)}
                          style={{ padding: 8, backgroundColor: `${colors.primary}10`, borderRadius: BorderRadius.sm }}
                        >
                          <Ionicons name={visible ? 'eye-off' : 'eye'} size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
                <TouchableOpacity
                  disabled={isSavingKeys}
                  onPress={handleSaveKeys}
                  style={{ backgroundColor: colors.primary, borderRadius: BorderRadius.sm, padding: 12, alignItems: 'center', opacity: isSavingKeys ? 0.5 : 1 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.md }}>{isSavingKeys ? 'Saving…' : 'Save Keys'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ─── CONNECTION STATUS ──────────────────────────────────── */}
        <SectionHead title="Connection Status" icon="pulse" iconColor="#00B894" iconBg="#00B89420" sectionKey="connection" />
        {expandedSections.connection && (
          <View style={{ marginBottom: 16, gap: 12 }}>
            {isLoading ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} style={{ width: '47%', backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 12, borderWidth: 1, borderColor: colors.cardBorder, gap: 6 }}>
                    <ShimmerRow width="50%" height={12} />
                    <ShimmerRow width="30%" />
                  </View>
                ))}
              </View>
            ) : debug ? (
              <>
                {/* Stats grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { label: 'Total Conversations', value: debug.conversations, color: '#74B9FF' },
                    { label: 'Open', value: debug.openConversations, color: '#00B894' },
                    { label: 'Messages', value: debug.messages, color: '#A29BFE' },
                    { label: 'Last Message', value: debug.lastMessageAt ? formatTime(debug.lastMessageAt) : '—', color: '#FDCB6E' },
                  ].map(stat => (
                    <View key={stat.label} style={{ width: '47%', backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 4 }}>{stat.label}</Text>
                      <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: stat.color }}>{stat.value}</Text>
                    </View>
                  ))}
                </View>
                {debug.lastMessagePreview && (
                  <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, fontStyle: 'italic', paddingHorizontal: 4 }} numberOfLines={2}>
                    Last: "{debug.lastMessagePreview}"
                  </Text>
                )}
              </>
            ) : (
              <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Connection stats unavailable</Text>
              </View>
            )}

            {/* Key status checklist */}
            <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, gap: 8 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Configuration Check</Text>
              {API_KEY_FIELDS.map(field => {
                const info = keys.find(k => k.key === field.key)
                const configured = info?.has_value ?? false
                return (
                  <View key={field.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={configured ? 'checkmark-circle' : 'alert-circle'} size={16} color={configured ? '#00B894' : '#FDCB6E'} />
                    <Text style={{ flex: 1, fontSize: FontSize.sm, color: colors.text }}>{field.label}</Text>
                    <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: configured ? '#00B894' : '#FDCB6E' }}>{configured ? 'OK' : 'Not set'}</Text>
                  </View>
                )
              })}
            </View>

            {/* Webhook URLs */}
            <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, gap: 8 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Webhook URLs</Text>
              {[
                { label: 'Callback URL', url: 'https://api.raven-ai.online/api/messaging/webhook/whatsapp' },
                { label: 'Verify URL', url: 'https://api.raven-ai.online/api/messaging/webhook/verify' },
              ].map(wh => (
                <TouchableOpacity
                  key={wh.label}
                  onPress={() => { Clipboard.setStringAsync(wh.url); Alert.alert('Copied', wh.label + ' copied to clipboard') }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.info}10`, borderRadius: BorderRadius.sm, padding: 8 }}
                >
                  <Ionicons name="copy-outline" size={14} color={colors.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.xs, color: colors.info, fontWeight: '600' }}>{wh.label}</Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }} numberOfLines={1}>{wh.url}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── PREFERENCES ───────────────────────────────────────── */}
        <SectionHead title="Preferences" icon={isDark ? 'moon' : 'sunny'} iconColor={isDark ? '#FDCB6E' : '#6C5CE7'} iconBg={isDark ? '#FDCB6E20' : '#6C5CE720'} sectionKey="preferences" />
        {expandedSections.preferences && (
          <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: BorderRadius.sm, backgroundColor: isDark ? '#FDCB6E20' : '#6C5CE720', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#FDCB6E' : '#6C5CE7'} />
                </View>
                <View>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>Dark Mode</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{isDark ? 'Dark theme active' : 'Light theme active'}</Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggle}
                trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                thumbColor={isDark ? colors.primary : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* ─── DATA & PRIVACY ────────────────────────────────────── */}
        <SectionHead title="Data & Privacy" icon="shield-checkmark" iconColor="#FF7675" iconBg="#FF767520" sectionKey="privacy" />
        {expandedSections.privacy && (
          <View style={{ marginBottom: 16, gap: 12 }}>
            {/* Self-service URL */}
            {tenantId ? (
              <TouchableOpacity
                onPress={() => { Clipboard.setStringAsync(selfServiceUrl); Alert.alert('Copied', 'Self-service URL copied') }}
                style={{ backgroundColor: `${colors.info}10`, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: `${colors.info}30`, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons name="link" size={16} color={colors.info} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.info }}>Customer Self-Service Portal</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{selfServiceUrl}</Text>
                </View>
                <Ionicons name="copy-outline" size={14} color={colors.info} />
              </TouchableOpacity>
            ) : null}

            {/* Manual deletion form */}
            <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, gap: 10 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.text }}>Submit Deletion Request</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['phone', 'email'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setDelType(t)}
                    style={{ flex: 1, backgroundColor: delType === t ? `${colors.primary}20` : colors.surface, borderRadius: BorderRadius.sm, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: delType === t ? colors.primary : colors.border }}
                  >
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: delType === t ? colors.primary : colors.textSecondary, textTransform: 'capitalize' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={delIdentifier}
                onChangeText={setDelIdentifier}
                placeholder={delType === 'phone' ? '+234XXXXXXXXXX' : 'customer@example.com'}
                placeholderTextColor={colors.textMuted}
                keyboardType={delType === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 10, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border }}
              />
              <TouchableOpacity
                disabled={isSubmittingDel || !delIdentifier.trim()}
                onPress={handleSubmitDeletion}
                style={{ backgroundColor: colors.error, borderRadius: BorderRadius.sm, padding: 10, alignItems: 'center', opacity: isSubmittingDel || !delIdentifier.trim() ? 0.5 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.sm }}>{isSubmittingDel ? 'Submitting…' : 'Submit Request'}</Text>
              </TouchableOpacity>
            </View>

            {/* Deletion requests list */}
            {deletionRequests.length > 0 && (
              <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, gap: 8 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 4 }}>Requests ({deletionRequests.length})</Text>
                {deletionRequests.slice(0, 10).map(req => {
                  const sc = req.status === 'completed' ? '#00B894' : req.status === 'failed' ? '#FF7675' : '#FDCB6E'
                  return (
                    <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: FontSize.sm, color: colors.text, fontFamily: 'monospace' }} numberOfLines={1}>{req.identifier}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>{req.identifier_type.toUpperCase()} · {formatDate(req.requested_at)}</Text>
                      </View>
                      <View style={{ backgroundColor: `${sc}18`, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: sc }}>{req.status.toUpperCase()}</Text>
                      </View>
                      {req.status === 'pending' && (
                        <TouchableOpacity
                          disabled={processingDelId === req.id}
                          onPress={() => handleProcessDeletion(req.id)}
                          style={{ backgroundColor: `${colors.error}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, opacity: processingDelId === req.id ? 0.5 : 1 }}
                        >
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.error }}>{processingDelId === req.id ? 'Erasing…' : 'Erase'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* ─── ABOUT ─────────────────────────────────────────────── */}
        <SectionHead title="About" icon="information-circle" iconColor="#636E72" iconBg="#636E7220" sectionKey="about" />
        {expandedSections.about && (
          <View style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16 }}>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Version</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text, marginTop: 4 }}>{APP_VERSION}</Text>
            </View>
          </View>
        )}

        {/* ─── SIGN OUT ──────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            backgroundColor: `${colors.error}10`,
            borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: `${colors.error}30`,
            padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.error }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
