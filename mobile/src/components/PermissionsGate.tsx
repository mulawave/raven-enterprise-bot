import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Platform, Linking, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../contexts/ThemeContext'

interface PermissionItem {
  key: string
  title: string
  description: string
  why: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  check: () => Promise<boolean>
  request: () => Promise<boolean>
}

interface Props {
  onAllGranted: () => void
}

export function PermissionsGate({ onAllGranted }: Props) {
  const { colors } = useTheme()
  const [statuses, setStatuses] = useState<Record<string, boolean | null>>({})
  const [requesting, setRequesting] = useState<string | null>(null)

  const permissions: PermissionItem[] = [
    {
      key: 'notifications',
      title: 'Push Notifications',
      description: 'Receive alerts when customers message you, orders arrive, or the bot needs your help.',
      why: 'Without this, you won\'t know when a customer is waiting for a reply or when a new order comes in.',
      icon: 'notifications',
      color: '#6C5CE7',
      check: async () => {
        const { status } = await Notifications.getPermissionsAsync()
        return status === 'granted'
      },
      request: async () => {
        const { status } = await Notifications.requestPermissionsAsync()
        return status === 'granted'
      },
    },
    {
      key: 'media',
      title: 'Photos & Media',
      description: 'Send images and videos to customers in your WhatsApp conversations.',
      why: 'You\'ll need this to share product photos, receipts, or any visual content with customers.',
      icon: 'images',
      color: '#00B894',
      check: async () => {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync()
        return status === 'granted'
      },
      request: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        return status === 'granted'
      },
    },
  ]

  const checkAll = useCallback(async () => {
    const results: Record<string, boolean> = {}
    for (const p of permissions) {
      results[p.key] = await p.check()
    }
    setStatuses(results)

    if (Object.values(results).every(Boolean)) {
      onAllGranted()
    }
  }, [])

  useEffect(() => {
    checkAll()
  }, [checkAll])

  async function handleRequest(item: PermissionItem) {
    setRequesting(item.key)
    try {
      const granted = await item.request()
      setStatuses((prev) => ({ ...prev, [item.key]: granted }))

      if (!granted) {
        // If denied, offer to open settings
        Linking.openSettings()
      }

      // Re-check all after a grant attempt
      const allResults: Record<string, boolean> = { ...statuses as Record<string, boolean>, [item.key]: granted }
      for (const p of permissions) {
        if (p.key !== item.key) {
          allResults[p.key] = await p.check()
        }
      }
      setStatuses(allResults)

      if (Object.values(allResults).every(Boolean)) {
        onAllGranted()
      }
    } finally {
      setRequesting(null)
    }
  }

  const allGranted = Object.keys(statuses).length === permissions.length && Object.values(statuses).every(Boolean)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>App Permissions</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Raven needs a few permissions to work properly. Here's exactly what each one does and why it's needed.
          </Text>
        </View>

        {permissions.map((item) => {
          const granted = statuses[item.key]
          const isRequesting = requesting === item.key

          return (
            <View key={item.key} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.permIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.permTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.permDesc, { color: colors.textMuted }]}>{item.description}</Text>
                </View>
              </View>

              <View style={[styles.whyBox, { backgroundColor: colors.background }]}>
                <Ionicons name="information-circle" size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
                <Text style={[styles.whyText, { color: colors.textMuted }]}>{item.why}</Text>
              </View>

              {granted === true ? (
                <View style={styles.grantedRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#00B894" />
                  <Text style={styles.grantedText}>Granted</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.grantBtn, { backgroundColor: item.color }]}
                  onPress={() => handleRequest(item)}
                  disabled={isRequesting}
                  activeOpacity={0.7}
                >
                  {isRequesting ? (
                    <Text style={styles.grantBtnText}>Requesting…</Text>
                  ) : (
                    <Text style={styles.grantBtnText}>Allow {item.title}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )
        })}

        {allGranted && (
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: colors.primary }]}
            onPress={onAllGranted}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {!allGranted && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onAllGranted}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  permIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  permTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  permDesc: { fontSize: 13, lineHeight: 18 },
  whyBox: {
    flexDirection: 'row', gap: 6, padding: 10, borderRadius: 10,
    marginTop: 12, alignItems: 'flex-start',
  },
  whyText: { fontSize: 12, lineHeight: 17, flex: 1 },
  grantBtn: {
    marginTop: 12, borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  grantBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  grantedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  grantedText: { fontSize: 13, fontWeight: '600', color: '#00B894' },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 14, marginTop: 8,
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipText: { fontSize: 13 },
})
