import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { Spacing, FontSize, BorderRadius } from '../constants/theme'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation'

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>
}

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const result = await login(email.trim(), password)
      if (result?.pendingVerification || result?.expiredVerification) {
        navigation.navigate('CheckEmail', {
          email: result.email || email.trim(),
          fromLogin: true,
        })
      }
    } catch (err: any) {
      const detail = err?.message || 'Unknown error'
      const status = err?.status ? ` [${err.status}]` : ''
      setError(`${detail}${status}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo area */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Image
            source={require('../../assets/icon.png')}
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              marginBottom: 20,
            }}
            resizeMode="contain"
          />
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.text }}>
            Welcome back
          </Text>
          <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, marginTop: 8 }}>
            Sign in to your Raven account
          </Text>
        </View>

        {/* Error */}
        {error ? (
          <View
            style={{
              backgroundColor: `${colors.error}15`,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: Spacing.lg,
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

        {/* Email */}
        <View style={{ marginBottom: Spacing.lg }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            Email address
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 16,
              height: 52,
            }}
          >
            <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Password */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
            Password
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 16,
              height: 52,
            }}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            height: 52,
            borderRadius: BorderRadius.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLoading ? 0.7 : 1,
            gap: 8,
            marginBottom: Spacing.xl,
          }}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Signing in…</Text>
            </>
          ) : (
            <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Register link */}
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
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
            }}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: FontSize.sm, fontWeight: '600' }}>
              Create an account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
