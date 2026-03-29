import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../contexts/ThemeContext'
import { FontSize, BorderRadius, Spacing } from '../constants/theme'
import { api } from '../lib/api'

const CHECKLIST_KEY = 'onboarding_checklist'

interface ChecklistState {
  whatsappConnected: boolean
  catalogueAdded: boolean
  faqsConfigured: boolean
  firstMessageSent: boolean
  orderingSetup: boolean
}

const DEFAULT_STATE: ChecklistState = {
  whatsappConnected: false,
  catalogueAdded: false,
  faqsConfigured: false,
  firstMessageSent: false,
  orderingSetup: false,
}

const STEPS: {
  key: keyof ChecklistState
  icon: string
  title: string
  desc: string
  tab: string
  screen?: string
  actionLabel: string
}[] = [
  {
    key: 'whatsappConnected',
    icon: '📱',
    title: 'Connect WhatsApp',
    desc: 'Enter your Meta API keys so the bot can receive and reply to messages.',
    tab: 'More',
    screen: 'Settings',
    actionLabel: 'Go to Settings',
  },
  {
    key: 'catalogueAdded',
    icon: '🍽️',
    title: 'Set up your catalogue',
    desc: 'Add at least one menu category and item so customers can browse and order.',
    tab: 'More',
    screen: 'Catalogue',
    actionLabel: 'Add menu items',
  },
  {
    key: 'faqsConfigured',
    icon: '❓',
    title: 'Configure FAQs',
    desc: 'Add common questions and answers your bot will use for customer queries.',
    tab: 'More',
    screen: 'Faqs',
    actionLabel: 'Configure FAQs',
  },
  {
    key: 'firstMessageSent',
    icon: '✉️',
    title: 'Send your first message',
    desc: 'Send a WhatsApp message to your bot number and confirm it replies correctly.',
    tab: 'Chats',
    actionLabel: 'View conversations',
  },
  {
    key: 'orderingSetup',
    icon: '🛒',
    title: 'Test the ordering flow',
    desc: 'Send "What\'s on the menu?" via WhatsApp and complete a test order.',
    tab: 'Orders',
    actionLabel: 'View orders',
  },
]

interface Props {
  navigation: any
}

export function OnboardingChecklist({ navigation }: Props) {
  const { colors } = useTheme()
  const [checklist, setChecklist] = useState<ChecklistState>(DEFAULT_STATE)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(CHECKLIST_KEY)
      .then(raw => {
        if (raw) {
          try {
            setChecklist(JSON.parse(raw) as ChecklistState)
            return
          } catch { /* ignore */ }
        }
        // Try API
        api<ChecklistState>('/api/tenant/onboarding-status')
          .then(data => {
            if (data) {
              setChecklist(data)
              AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(data)).catch(() => {})
            }
          })
          .catch(() => {})
      })
      .catch(() => {})
  }, [])

  const markDone = useCallback((key: keyof ChecklistState) => {
    setChecklist(prev => {
      const next = { ...prev, [key]: true }
      AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const completedCount = Object.values(checklist).filter(Boolean).length
  const allDone = completedCount === STEPS.length

  if (dismissed) return null

  // Success badge
  if (allDone) {
    return (
      <View
        style={{
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: '#22c55e30',
          backgroundColor: '#22c55e10',
          padding: Spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>🎉</Text>
          <View>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#22c55e' }}>Setup complete!</Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>All onboarding steps done.</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const progressFraction = completedCount / STEPS.length

  return (
    <View
      style={{
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <TouchableOpacity
        onPress={() => setCollapsed(c => !c)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 16 }}>🎓</Text>
          <View>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.text }}>Beginners Guide</Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>
              {completedCount} of {STEPS.length} steps complete
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Progress bar */}
          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${progressFraction * 100}%`, backgroundColor: `${colors.primary}30` }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{completedCount}</Text>
          </View>
          <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {/* Steps */}
      {!collapsed && (
        <View>
          {STEPS.map(step => {
            const done = checklist[step.key]
            return (
              <View
                key={step.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  opacity: done ? 0.5 : 1,
                }}
              >
                {/* Checkbox */}
                <TouchableOpacity
                  onPress={() => markDone(step.key)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: done ? '#22c55e' : colors.border,
                    backgroundColor: done ? '#22c55e' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 2,
                  }}
                >
                  {done && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: FontSize.sm,
                      fontWeight: '600',
                      color: done ? colors.textMuted : colors.text,
                      textDecorationLine: done ? 'line-through' : 'none',
                      marginBottom: 2,
                    }}
                  >
                    {step.icon} {step.title}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 }}>
                    {step.desc}
                  </Text>
                  {!done && (
                    <TouchableOpacity
                      onPress={() => {
                        markDone(step.key)
                        if (step.screen) {
                          navigation.navigate('More', { screen: step.screen })
                        } else {
                          navigation.navigate(step.tab)
                        }
                      }}
                      style={{
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: BorderRadius.sm,
                        backgroundColor: `${colors.primary}15`,
                      }}
                    >
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.primary }}>
                        {step.actionLabel}
                      </Text>
                      <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
