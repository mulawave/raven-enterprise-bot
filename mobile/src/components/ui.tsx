// ─── Shared UI Components ───────────────────────────────────────────────────
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { Spacing, FontSize, BorderRadius } from '../constants/theme'

// ── Button ────────────────────────────────────────────────────────────────

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  isLoading?: boolean
  loadingText?: string
  disabled?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  size?: 'sm' | 'md' | 'lg'
  style?: ViewStyle
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  loadingText,
  disabled = false,
  icon,
  size = 'md',
  style,
}: ButtonProps) {
  const { colors } = useTheme()
  const isDisabled = disabled || isLoading

  const bgColors = {
    primary: colors.primary,
    secondary: colors.surfaceElevated,
    danger: colors.error,
    ghost: 'transparent',
  }

  const textColors = {
    primary: '#ffffff',
    secondary: colors.text,
    danger: '#ffffff',
    ghost: colors.primary,
  }

  const heights = { sm: 36, md: 48, lg: 56 }
  const fontSizes = { sm: FontSize.sm, md: FontSize.md, lg: FontSize.lg }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        {
          backgroundColor: bgColors[variant],
          height: heights[size],
          borderRadius: BorderRadius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Spacing.xl,
          opacity: isDisabled ? 0.5 : 1,
          gap: Spacing.sm,
        },
        variant === 'ghost' && {
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color={textColors[variant]} />
          {loadingText && (
            <Text style={{ color: textColors[variant], fontSize: fontSizes[size], fontWeight: '600' }}>
              {loadingText}
            </Text>
          )}
        </>
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={textColors[variant]} />}
          <Text style={{ color: textColors[variant], fontSize: fontSizes[size], fontWeight: '600' }}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  onPress?: () => void
}

export function Card({ children, style, onPress }: CardProps) {
  const { colors, isDark } = useTheme()

  const shadow: ViewStyle = isDark ? {} : {
    shadowColor: '#173a6c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  }

  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: Spacing.lg,
    ...shadow,
    ...style,
  }

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={cardStyle}>
        {children}
      </TouchableOpacity>
    )
  }

  return <View style={cardStyle}>{children}</View>
}

// ── StatCard ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string
  value: string | number
  icon: keyof typeof Ionicons.glyphMap
  color: string
  colorBg: string
  subtitle?: string
  children?: React.ReactNode
}

export function StatCard({ title, value, icon, color, colorBg, subtitle, children }: StatCardProps) {
  const { colors, isDark } = useTheme()

  const shadow: ViewStyle = isDark ? {} : {
    shadowColor: '#173a6c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  }

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: Spacing.lg,
        flex: 1,
        minWidth: 140,
        ...shadow,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: BorderRadius.md,
          backgroundColor: colorBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 2 }}>
        {title}
      </Text>
      <Text style={{ fontSize: FontSize.xxl, fontWeight: '700', color: colors.text }}>
        {value}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 }}>
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string
  color: string
  bgColor: string
}

export function Badge({ label, color, bgColor }: BadgeProps) {
  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color }}>{label}</Text>
    </View>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  icon?: keyof typeof Ionicons.glyphMap
  iconColor?: string
  rightElement?: React.ReactNode
}

export function SectionHeader({ title, icon, iconColor, rightElement }: SectionHeaderProps) {
  const { colors } = useTheme()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        {icon && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: BorderRadius.sm,
              backgroundColor: iconColor ? `${iconColor}20` : colors.primaryBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={16} color={iconColor || colors.primary} />
          </View>
        )}
        <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>{title}</Text>
      </View>
      {rightElement}
    </View>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme()

  return (
    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: BorderRadius.xl,
          backgroundColor: colors.primaryBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.lg,
        }}
      >
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary }}>{title}</Text>
      {subtitle && (
        <Text style={{ fontSize: FontSize.sm, color: colors.textMuted, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xxxl }}>
          {subtitle}
        </Text>
      )}
    </View>
  )
}

// ── ShimmerRow ────────────────────────────────────────────────────────────

export function ShimmerRow({ width = '100%', height = 16 }: { width?: number | string; height?: number }) {
  const { colors } = useTheme()

  return (
    <View
      style={{
        width: width as any,
        height,
        borderRadius: BorderRadius.sm,
        backgroundColor: colors.shimmer,
        opacity: 0.6,
      }}
    />
  )
}

// ── RefreshableScrollView ─────────────────────────────────────────────────

interface RefreshableScrollViewProps {
  children: React.ReactNode
  refreshing: boolean
  onRefresh: () => void
  style?: ViewStyle
}

export function RefreshableScrollView({ children, refreshing, onRefresh, style }: RefreshableScrollViewProps) {
  const { colors } = useTheme()

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {children}
    </ScrollView>
  )
}

// ── ListItem ──────────────────────────────────────────────────────────────

interface ListItemProps {
  title: string
  subtitle?: string
  leftIcon?: keyof typeof Ionicons.glyphMap
  leftIconColor?: string
  rightText?: string
  rightColor?: string
  onPress?: () => void
  badge?: { label: string; color: string; bgColor: string }
}

export function ListItem({ title, subtitle, leftIcon, leftIconColor, rightText, rightColor, onPress, badge }: ListItemProps) {
  const { colors } = useTheme()

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
      {leftIcon && (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: BorderRadius.md,
            backgroundColor: leftIconColor ? `${leftIconColor}20` : colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={leftIcon} size={18} color={leftIconColor || colors.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FontSize.md, fontWeight: '500', color: colors.text }}>{title}</Text>
        {subtitle && (
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {badge && <Badge label={badge.label} color={badge.color} bgColor={badge.bgColor} />}
      {rightText && (
        <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: rightColor || colors.text }}>{rightText}</Text>
      )}
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}
