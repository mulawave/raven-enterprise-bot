import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { Spacing, FontSize, BorderRadius, BrandColors } from '../constants/theme'
import { API_BASE_URL } from '../constants/config'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../navigation'

interface Props {
  navigation: NativeStackNavigationProp<MoreStackParamList, 'MoreMenu'>
}

interface MenuItem {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  screen: keyof MoreStackParamList
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Customers',
    subtitle: 'View and manage contacts',
    icon: 'people',
    iconColor: '#74B9FF',
    screen: 'Customers',
  },
  {
    title: 'Contacts',
    subtitle: 'Saved contact names & notes',
    icon: 'book',
    iconColor: '#6C5CE7',
    screen: 'Contacts',
  },
  {
    title: 'Bookings',
    subtitle: 'Manage appointments & reservations',
    icon: 'calendar',
    iconColor: '#A29BFE',
    screen: 'Bookings',
  },
  {
    title: 'Catalogue',
    subtitle: 'Products, categories & pricing',
    icon: 'grid',
    iconColor: '#00B894',
    screen: 'Catalogue',
  },
  {
    title: 'AI Bot',
    subtitle: 'Auto-reply & bot personality',
    icon: 'hardware-chip',
    iconColor: '#A29BFE',
    screen: 'Bots',
  },
  {
    title: 'FAQs',
    subtitle: 'Train your AI bot with Q&A',
    icon: 'help-circle',
    iconColor: '#00CEC9',
    screen: 'Faqs',
  },
  {
    title: 'Email List',
    subtitle: 'Collected customer emails',
    icon: 'mail',
    iconColor: '#FDCB6E',
    screen: 'EmailList',
  },
  {
    title: 'Analytics',
    subtitle: 'Business performance overview',
    icon: 'bar-chart',
    iconColor: '#0984E3',
    screen: 'Analytics',
  },
  {
    title: 'Subscription',
    subtitle: 'Plan, usage & billing',
    icon: 'diamond',
    iconColor: '#00B894',
    screen: 'Subscription',
  },
  {
    title: 'Broadcast',
    subtitle: 'Send messages to customers',
    icon: 'megaphone',
    iconColor: '#FDCB6E',
    screen: 'Broadcast',
  },
  {
    title: 'Settings',
    subtitle: 'App preferences & account',
    icon: 'settings',
    iconColor: '#636E72',
    screen: 'Settings',
  },
]

export function MoreScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { session, logout } = useAuth()
  const insets = useSafeAreaInsets()

  const [tenantContext, setTenantContext] = useState<any>(null)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    api<any>('/tenant/context')
      .then(ctx => setTenantContext(ctx))
      .catch(() => {})
  }, [])

  const rawLogoUrl = tenantContext?.branding?.logoUrl
  const resolvedLogoUrl = rawLogoUrl
    ? (rawLogoUrl.startsWith('http') ? rawLogoUrl : `${API_BASE_URL}${rawLogoUrl}`)
    : null
  const hasLogo = !logoFailed && !!resolvedLogoUrl
  const brandName = tenantContext?.branding?.businessName || session?.tenant?.name || 'Your Brand'
  const ownerName = session?.user?.name || 'Account Owner'

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
              backgroundColor: `${colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="grid" size={18} color={colors.primary} />
          </View>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: colors.text }}>More</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Profile card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            padding: 20,
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: BrandColors.navyDark,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Image
              source={
                hasLogo
                  ? { uri: resolvedLogoUrl! }
                  : require('../../assets/icon.png')
              }
              style={{ width: 52, height: 52, borderRadius: 16 }}
              resizeMode="cover"
              onError={() => setLogoFailed(true)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>
              {brandName}
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>
              Owner: {ownerName}
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 1 }}>
              {session?.user?.email}
            </Text>
          </View>
        </View>

        {/* Menu items */}
        <View style={{ gap: 8 }}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(item.screen)}
              style={{
                backgroundColor: colors.card,
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: BorderRadius.md,
                  backgroundColor: `${item.iconColor}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.text }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.7}
          style={{
            marginTop: 32,
            backgroundColor: `${colors.error}10`,
            borderRadius: BorderRadius.lg,
            borderWidth: 1,
            borderColor: `${colors.error}30`,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.error }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
