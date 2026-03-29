import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, Switch, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, Spacing } from '../constants/theme'
import { Card, ShimmerRow } from '../components/ui'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface BotConfig {
  enabled: boolean
  systemPrompt: string
  hasOpenAiKey: boolean
  hasWaConfig: boolean
}

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'Bots'>
}

export function BotsScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [config, setConfig] = useState<BotConfig | null>(null)
  const [faqCount, setFaqCount] = useState(0)
  const [catalogueCount, setCatalogueCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isToggling, setIsToggling] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [botRes, faqRes, catRes] = await Promise.all([
        api<any>('/api/settings/bot').catch(() => null),
        api<any>('/api/faqs').catch(() => []),
        api<any>('/api/ordering/menu/categories').catch(() => []),
      ])
      const bot = botRes?.data ?? botRes
      if (bot) {
        setConfig({
          enabled: bot.enabled ?? false,
          systemPrompt: bot.systemPrompt || bot.system_prompt || '',
          hasOpenAiKey: bot.hasOpenAiKey ?? bot.has_openai_key ?? false,
          hasWaConfig: bot.hasWaConfig ?? bot.has_wa_config ?? false,
        })
        setPrompt(bot.systemPrompt || bot.system_prompt || '')
      }
      const faqs = faqRes?.data ?? faqRes ?? []
      setFaqCount(Array.isArray(faqs) ? faqs.length : 0)
      const cats = catRes?.data ?? catRes ?? []
      setCatalogueCount(Array.isArray(cats) ? cats.length : 0)
    } catch {
      // keep existing
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  async function handleToggle(value: boolean) {
    if (!config) return
    setIsToggling(true)
    try {
      await api('/api/settings/bot', {
        method: 'POST',
        body: { enabled: value },
      })
      setConfig({ ...config, enabled: value })
    } catch {
      Alert.alert('Error', 'Failed to update bot status')
    } finally {
      setIsToggling(false)
    }
  }

  async function handleSavePrompt() {
    setIsSaving(true)
    try {
      await api('/api/settings/bot', {
        method: 'POST',
        body: { systemPrompt: prompt.trim() },
      })
      Alert.alert('Saved', 'Bot personality updated')
    } catch {
      Alert.alert('Error', 'Failed to save prompt')
    } finally {
      setIsSaving(false)
    }
  }

  function StatusDot({ ok, label }: { ok: boolean; label: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ok ? '#00B894' : '#FF7675' }} />
        <Text style={{ fontSize: FontSize.sm, color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: FontSize.xs, color: ok ? '#00B894' : '#FF7675', fontWeight: '600' }}>{ok ? 'Connected' : 'Not configured'}</Text>
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
          <View style={{ width: 32, height: 32, borderRadius: BorderRadius.sm, backgroundColor: '#A29BFE20', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="hardware-chip" size={16} color="#A29BFE" />
          </View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>AI Bot</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ backgroundColor: colors.card, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
                <ShimmerRow width="50%" />
                <ShimmerRow width="80%" height={12} />
              </View>
            ))}
          </>
        ) : !config ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Ionicons name="hardware-chip-outline" size={48} color={colors.textMuted} />
            <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, marginTop: 12 }}>Bot settings unavailable</Text>
          </View>
        ) : (
          <>
            {/* Integration status */}
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Integration Status</Text>
              <View style={{ gap: 10 }}>
                <StatusDot ok={config.hasWaConfig} label="WhatsApp" />
                <StatusDot ok={config.hasOpenAiKey} label="OpenAI" />
              </View>
            </Card>

            {/* Auto-reply toggle */}
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text }}>Auto-Reply</Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                    {config.enabled ? 'Bot is responding to messages' : 'Bot is paused'}
                  </Text>
                </View>
                <Switch
                  value={config.enabled}
                  onValueChange={handleToggle}
                  disabled={isToggling || (!config.hasOpenAiKey && !config.enabled)}
                  trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                  thumbColor={config.enabled ? colors.primary : colors.textMuted}
                />
              </View>
              {!config.hasOpenAiKey && (
                <Text style={{ fontSize: FontSize.xs, color: '#FF7675', marginTop: 8 }}>
                  OpenAI key required to enable the bot
                </Text>
              )}
            </Card>

            {/* Bot personality */}
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Bot Personality</Text>
              <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 10 }}>
                Describe how the bot should behave and respond
              </Text>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="e.g. You are a helpful assistant for our restaurant…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={{ backgroundColor: colors.surface, borderRadius: BorderRadius.sm, padding: 12, color: colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: colors.border, minHeight: 200 }}
              />
              <TouchableOpacity
                disabled={isSaving}
                onPress={handleSavePrompt}
                style={{ marginTop: 10, backgroundColor: colors.primary, borderRadius: BorderRadius.sm, padding: 12, alignItems: 'center', opacity: isSaving ? 0.5 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: FontSize.md }}>{isSaving ? 'Saving…' : 'Save Prompt'}</Text>
              </TouchableOpacity>
            </Card>

            {/* Knowledge base */}
            <Card>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Knowledge Base</Text>
              <View style={{ gap: 10 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Faqs')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: BorderRadius.sm, backgroundColor: '#00CEC920', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="help-circle" size={18} color="#00CEC9" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>FAQs</Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{faqCount} question{faqCount !== 1 ? 's' : ''} trained</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Catalogue')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: BorderRadius.sm, backgroundColor: '#00B89420', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="grid" size={18} color="#00B894" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>Catalogue</Text>
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{catalogueCount} categor{catalogueCount !== 1 ? 'ies' : 'y'} indexed</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  )
}
