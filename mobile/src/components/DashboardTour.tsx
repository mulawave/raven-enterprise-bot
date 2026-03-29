import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../contexts/ThemeContext'
import { FontSize, BorderRadius, Spacing } from '../constants/theme'

const TOUR_SEEN_KEY = 'dashboard_tour_seen'

const TOUR_STEPS = [
  {
    icon: 'home' as keyof typeof Ionicons.glyphMap,
    color: '#f49617',
    title: 'Home',
    body: 'Your command centre. See total conversations, revenue, active customers and a live feed at a glance.',
  },
  {
    icon: 'chatbubbles' as keyof typeof Ionicons.glyphMap,
    color: '#22c55e',
    title: 'Conversations',
    body: 'Every WhatsApp, Instagram, or Facebook chat your AI bot handles. Read, reply, and escalate from here.',
  },
  {
    icon: 'receipt' as keyof typeof Ionicons.glyphMap,
    color: '#6366f1',
    title: 'Orders',
    body: 'Orders placed by customers through WhatsApp. Update status from pending → confirmed → ready → delivered.',
  },
  {
    icon: 'restaurant' as keyof typeof Ionicons.glyphMap,
    color: '#f49617',
    title: 'Menu / Catalogue',
    body: 'Add your products, services or menu items. The bot uses this to answer "What do you have?" and take orders.',
  },
  {
    icon: 'people' as keyof typeof Ionicons.glyphMap,
    color: '#3b82f6',
    title: 'Customers',
    body: 'Everyone who has messaged you. View history, contact details, and conversation threads.',
  },
  {
    icon: 'megaphone' as keyof typeof Ionicons.glyphMap,
    color: '#ec4899',
    title: 'Broadcast',
    body: 'Send a message to all your customers at once — promotions, updates, announcements.',
  },
  {
    icon: 'bar-chart' as keyof typeof Ionicons.glyphMap,
    color: '#14b8a6',
    title: 'Analytics',
    body: 'Conversation volume, response times, popular intents, peak hours. Understand how customers engage.',
  },
  {
    icon: 'settings' as keyof typeof Ionicons.glyphMap,
    color: '#8b5cf6',
    title: 'Settings',
    body: 'Update your business name, brand colour, logo, and connected WhatsApp number.',
  },
]

interface Props {
  onDismiss: () => void
}

export function DashboardTour({ onDismiss }: Props) {
  const { colors } = useTheme()
  const [stepIdx, setStepIdx] = useState(0)
  const step = TOUR_STEPS[stepIdx]
  const isLast = stepIdx === TOUR_STEPS.length - 1
  const { width } = Dimensions.get('window')

  function handleDone() {
    AsyncStorage.setItem(TOUR_SEEN_KEY, '1').catch(() => {})
    onDismiss()
  }

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleDone}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        {/* Card */}
        <TouchableOpacity
          activeOpacity={1}
          style={{
            width: Math.min(width - 64, 340),
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {/* Progress bar */}
          <View style={{ flexDirection: 'row', gap: 3, marginBottom: 16 }}>
            {TOUR_STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: i <= stepIdx ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          {/* Step counter */}
          <Text
            style={{
              fontSize: FontSize.xs,
              fontWeight: '700',
              color: colors.primary,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: 12,
            }}
          >
            {stepIdx + 1} of {TOUR_STEPS.length}
          </Text>

          {/* Icon */}
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: `${step.color}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Ionicons name={step.icon} size={26} color={step.color} />
          </View>

          {/* Title & body */}
          <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: colors.text, marginBottom: 8 }}>
            {step.title}
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 }}>
            {step.body}
          </Text>

          {/* Navigation */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {stepIdx > 0 && (
              <TouchableOpacity
                onPress={() => setStepIdx(i => i - 1)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>← Back</Text>
              </TouchableOpacity>
            )}
            {!isLast ? (
              <TouchableOpacity
                onPress={() => setStepIdx(i => i + 1)}
                style={{
                  flex: 2,
                  height: 44,
                  borderRadius: BorderRadius.md,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff' }}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleDone}
                style={{
                  flex: 2,
                  height: 44,
                  borderRadius: BorderRadius.md,
                  backgroundColor: colors.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#fff' }}>Let's go!</Text>
                <Text style={{ fontSize: 14 }}>🚀</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Skip */}
          <TouchableOpacity onPress={handleDone} style={{ alignItems: 'center', marginTop: 12 }}>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted }}>Skip tour</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

/** Hook that returns true if the tour should be shown */
export function useShouldShowTour(): [boolean, () => void] {
  const [show, setShow] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(TOUR_SEEN_KEY).then(val => {
      if (!val) setShow(true)
    }).catch(() => {})
  }, [])

  function dismiss() {
    setShow(false)
    AsyncStorage.setItem(TOUR_SEEN_KEY, '1').catch(() => {})
  }

  return [show, dismiss]
}
