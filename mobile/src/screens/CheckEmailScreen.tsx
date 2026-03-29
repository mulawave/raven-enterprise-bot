import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Keyboard, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { FontSize, BorderRadius, Spacing } from '../constants/theme'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import type { AuthStackParamList } from '../navigation'

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'CheckEmail'>
  route: RouteProp<AuthStackParamList, 'CheckEmail'>
}

const CODE_LENGTH = 6

export function CheckEmailScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const { setSessionDirectly } = useAuth()
  const insets = useSafeAreaInsets()
  const email = route.params?.email || ''
  const fromLogin = route.params?.fromLogin ?? false

  const [code, setCode] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const inputRef = useRef<TextInput>(null)
  const hasAutoResent = useRef(false)

  // Auto-resend on mount (handles "came from login" flow)
  useEffect(() => {
    if (email && !hasAutoResent.current) {
      hasAutoResent.current = true
      handleResend(true)
    }
  }, [email])

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleConfirm()
    }
  }, [code])

  const handleResend = useCallback(async (silent = false) => {
    if (cooldown > 0 || isResending) return
    setIsResending(true)
    if (!silent) setResendMsg('')
    setError('')
    try {
      await api('/api/auth/resend-confirmation', {
        method: 'POST',
        body: { email },
      })
      if (!silent) setResendMsg('A new confirmation email has been sent.')
      setCooldown(60)
    } catch (err: any) {
      if (!silent) {
        setResendMsg(err?.message || 'Could not resend. Please try again.')
      }
    } finally {
      setIsResending(false)
    }
  }, [cooldown, isResending, email])

  const handleConfirm = useCallback(async () => {
    if (code.length !== CODE_LENGTH || isConfirming) return
    Keyboard.dismiss()
    setIsConfirming(true)
    setError('')
    try {
      const data = await api<{
        access_token: string
        user: { id: string; email: string; name: string; role: string; tenant_id: string }
        onboarding_step: string
      }>('/api/auth/confirm-by-code', {
        method: 'POST',
        body: { email, code },
      })

      // Fetch tenant context
      let tenant: { id: string; name: string; status: string } | undefined
      try {
        const ctx = await api<{ tenant: { id: string; name: string; status: string } }>('/tenant/context', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        tenant = ctx.tenant
      } catch {
        tenant = { id: data.user.tenant_id, name: '', status: 'ACTIVE' }
      }

      await setSessionDirectly({
        accessToken: data.access_token,
        user: { ...data.user, scope: 'TENANT' },
        tenant,
        onboardingCompleted: false,
      })
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.')
      setCode('')
    } finally {
      setIsConfirming(false)
    }
  }, [code, isConfirming, email, setSessionDirectly])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 20,
        paddingHorizontal: 32,
        justifyContent: 'center',
      }}
    >
      {/* Icon */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: `${colors.primary}20`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            borderWidth: 1.5,
            borderColor: `${colors.primary}40`,
          }}
        >
          <Ionicons name="mail-open" size={40} color={colors.primary} />
        </View>

        <Text
          style={{
            fontSize: FontSize.xxl,
            fontWeight: '800',
            color: colors.text,
            textAlign: 'center',
          }}
        >
          {fromLogin ? 'Verify your email' : 'Check your email'}
        </Text>

        {fromLogin && (
          <Text
            style={{
              fontSize: FontSize.sm,
              color: colors.accent,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Your email isn't verified yet — check your inbox
          </Text>
        )}
      </View>

      {/* Email display */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BorderRadius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Spacing.lg,
          marginBottom: 24,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: FontSize.md,
            fontWeight: '700',
            color: colors.primary,
            textAlign: 'center',
          }}
        >
          {email}
        </Text>
      </View>

      {/* Instructions */}
      <Text
        style={{
          fontSize: FontSize.md,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 24,
        }}
      >
        Enter the 6-digit code from your confirmation email to activate your account.
      </Text>

      {/* 6-digit code input */}
      <View style={{ marginBottom: 16 }}>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={t => {
            const digits = t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH)
            setCode(digits)
            setError('')
          }}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          style={{
            backgroundColor: colors.surface,
            borderRadius: BorderRadius.lg,
            borderWidth: 2,
            borderColor: error ? colors.error : code.length === CODE_LENGTH ? colors.primary : colors.border,
            padding: 20,
            fontSize: 32,
            fontWeight: '800',
            color: colors.text,
            textAlign: 'center',
            letterSpacing: 12,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          }}
          placeholder="000000"
          placeholderTextColor={colors.textMuted}
          editable={!isConfirming}
          autoFocus
        />
      </View>

      {/* Error */}
      {error ? (
        <View
          style={{
            backgroundColor: `${colors.error}15`,
            borderRadius: BorderRadius.md,
            padding: Spacing.md,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: `${colors.error}30`,
          }}
        >
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={{ color: colors.error, fontSize: FontSize.sm, flex: 1 }}>{error}</Text>
        </View>
      ) : null}

      {/* Confirm button */}
      <TouchableOpacity
        onPress={handleConfirm}
        disabled={isConfirming || code.length !== CODE_LENGTH}
        activeOpacity={0.8}
        style={{
          backgroundColor: colors.primary,
          height: 52,
          borderRadius: BorderRadius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isConfirming || code.length !== CODE_LENGTH ? 0.6 : 1,
          gap: 8,
          marginBottom: 20,
        }}
      >
        {isConfirming ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Verifying…</Text>
          </>
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Verify Code</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Resend section */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        {resendMsg ? (
          <Text style={{ fontSize: FontSize.sm, color: colors.primary, marginBottom: 8, textAlign: 'center' }}>
            {resendMsg}
          </Text>
        ) : null}
        <TouchableOpacity
          onPress={() => handleResend(false)}
          disabled={isResending || cooldown > 0}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: BorderRadius.lg,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: isResending || cooldown > 0 ? 0.5 : 1,
          }}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          )}
          <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
            {isResending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend confirmation email'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tips card */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: BorderRadius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Spacing.lg,
          marginBottom: 24,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.text }}>
            Didn't receive it?
          </Text>
        </View>
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20 }}>
          • Check your spam or promotions folder{'\n'}
          • Make sure {email || 'the address'} is correct{'\n'}
          • Wait a few minutes and try again
        </Text>
      </View>

      {/* Back to login */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 24,
          borderRadius: BorderRadius.lg,
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: Spacing.md,
        }}
      >
        <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' }}>Back to Sign In</Text>
      </TouchableOpacity>

      {/* Start over */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: BorderRadius.lg,
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' }}>
          Start over
        </Text>
      </TouchableOpacity>
    </View>
  )
}
