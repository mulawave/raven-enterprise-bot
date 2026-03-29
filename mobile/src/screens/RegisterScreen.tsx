import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../contexts/ThemeContext'
import { api } from '../lib/api'
import { Spacing, FontSize, BorderRadius } from '../constants/theme'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../navigation'

interface Props {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>
}

// ── Password strength helpers ─────────────────────────────────────────────

const PW_CRITERIA = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /\d/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getPasswordStrength(password: string) {
  return PW_CRITERIA.filter(c => c.test(password)).length
}

const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']
const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']

// ── Email validation ──────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type EmailStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error'

// ── Plans ─────────────────────────────────────────────────────────────────

interface Plan {
  tier: string
  name: string
  price: string
  features: string[]
  color: string
  icon: keyof typeof Ionicons.glyphMap
}

const PLANS: Plan[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '₦49,000',
    features: ['500 conversations/mo', 'WhatsApp bot', 'Basic analytics'],
    color: '#6366f1',
    icon: 'rocket-outline',
  },
  {
    tier: 'growth',
    name: 'Growth',
    price: '₦199,000',
    features: ['5,000 conversations/mo', 'Multi-channel', 'Advanced analytics'],
    color: '#f49617',
    icon: 'trending-up-outline',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: '₦799,000',
    features: ['Unlimited conversations', 'Priority support', 'Custom integrations'],
    color: '#10b981',
    icon: 'diamond-outline',
  },
]

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme()

  // Step tracking
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const [emailMsg, setEmailMsg] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Step 2 fields
  const [selectedPlan, setSelectedPlan] = useState<string>('starter')

  // Loading / error
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Debounce timer ref
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Email check ────────────────────────────────────────────────────────

  const checkEmailAvailability = useCallback(async (emailVal: string) => {
    if (!EMAIL_RE.test(emailVal)) {
      setEmailStatus('invalid')
      setEmailMsg('Enter a valid email address')
      return
    }
    setEmailStatus('checking')
    setEmailMsg('')
    try {
      const res = await api<{ available: boolean; reason?: string }>(
        `/api/auth/check-email?email=${encodeURIComponent(emailVal)}`,
      )
      if (res.available) {
        setEmailStatus('available')
        setEmailMsg('')
      } else {
        setEmailStatus('taken')
        setEmailMsg(res.reason || 'This email is already registered')
      }
    } catch {
      setEmailStatus('error')
      setEmailMsg('Could not verify email')
    }
  }, [])

  function handleEmailChange(val: string) {
    setEmail(val)
    setEmailStatus('idle')
    setEmailMsg('')
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current)
    if (val.trim().length > 4 && EMAIL_RE.test(val.trim())) {
      emailTimerRef.current = setTimeout(() => checkEmailAvailability(val.trim()), 800)
    }
  }

  function handleEmailBlur() {
    if (email.trim() && emailStatus === 'idle') {
      checkEmailAvailability(email.trim())
    }
  }

  // ── Step 1 validation ──────────────────────────────────────────────────

  const pwStrength = getPasswordStrength(password)
  const allCriteriaMet = pwStrength === 5
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const step1Valid =
    name.trim().length > 0 &&
    emailStatus === 'available' &&
    allCriteriaMet &&
    passwordsMatch &&
    termsAccepted

  // ── Submit ──────────────────────────────────────────────────────────────

  async function handleRegister() {
    setError('')
    setIsLoading(true)
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: {
          name: name.trim(),
          email: email.trim(),
          password,
          planTier: selectedPlan,
        },
      })
      navigation.navigate('CheckEmail', { email: email.trim() })
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Shared Styles ──────────────────────────────────────────────────────

  const inputStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 52,
  }

  // ── Email status indicator ─────────────────────────────────────────────

  function renderEmailIndicator() {
    if (emailStatus === 'checking') return <ActivityIndicator size="small" color={colors.primary} />
    if (emailStatus === 'available') return <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
    if (emailStatus === 'taken') return <Ionicons name="close-circle" size={20} color={colors.error} />
    if (emailStatus === 'invalid') return <Ionicons name="alert-circle" size={20} color={colors.error} />
    return null
  }

  // ── STEP 1 ─────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingVertical: 50 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              alignSelf: 'flex-start',
              padding: 10,
              borderRadius: BorderRadius.md,
              backgroundColor: colors.surfaceElevated,
              marginBottom: Spacing.xl,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: `${colors.accent}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                borderWidth: 1.5,
                borderColor: `${colors.accent}40`,
              }}
            >
              <Ionicons name="person-add" size={30} color={colors.accent} />
            </View>
            <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.text }}>
              Create Account
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
              Step 1 of 2 — Account details
            </Text>
          </View>

          {/* Progress bar */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
            <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border }} />
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

          {/* Full Name */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Full name
            </Text>
            <View style={inputStyle}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={name}
                onChangeText={setName}
                placeholder="Jane Adeyemi"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Email address
            </Text>
            <View
              style={[
                inputStyle,
                emailStatus === 'available' && { borderColor: '#22c55e' },
                (emailStatus === 'taken' || emailStatus === 'invalid') && { borderColor: colors.error },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={email}
                onChangeText={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="you@business.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {renderEmailIndicator()}
            </View>
            {emailMsg ? (
              <Text
                style={{
                  fontSize: FontSize.xs,
                  color: emailStatus === 'available' ? '#22c55e' : colors.error,
                  marginTop: 6,
                  marginLeft: 4,
                }}
              >
                {emailMsg}
              </Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Password
            </Text>
            <View style={inputStyle}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 8 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Strength bar */}
            {password.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: i < pwStrength ? STRENGTH_COLORS[pwStrength - 1] : colors.border,
                      }}
                    />
                  ))}
                </View>
                <Text style={{ fontSize: FontSize.xs, color: STRENGTH_COLORS[pwStrength - 1] || colors.textMuted }}>
                  {pwStrength > 0 ? STRENGTH_LABELS[pwStrength - 1] : 'Too short'}
                </Text>

                {/* Show unmet criteria */}
                {!allCriteriaMet && (
                  <View style={{ marginTop: 8, gap: 4 }}>
                    {PW_CRITERIA.map(c => (
                      <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons
                          name={c.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={c.test(password) ? '#22c55e' : colors.textMuted}
                        />
                        <Text
                          style={{
                            fontSize: FontSize.xs,
                            color: c.test(password) ? '#22c55e' : colors.textMuted,
                          }}
                        >
                          {c.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Confirm password
            </Text>
            <View
              style={[
                inputStyle,
                confirmPassword.length > 0 && passwordsMatch && { borderColor: '#22c55e' },
                confirmPassword.length > 0 && !passwordsMatch && { borderColor: colors.error },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={{ fontSize: FontSize.xs, color: colors.error, marginTop: 6, marginLeft: 4 }}>
                Passwords do not match
              </Text>
            )}
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            onPress={() => setTermsAccepted(!termsAccepted)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 28 }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: termsAccepted ? colors.primary : colors.border,
                backgroundColor: termsAccepted ? colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, flex: 1, lineHeight: 20 }}>
              I agree to the{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '600' }}
                onPress={() => Linking.openURL('https://app.raven-ai.online/terms')}
              >
                Terms &amp; Conditions
              </Text>
              {' '}and{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '600' }}
                onPress={() => Linking.openURL('https://app.raven-ai.online/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Continue button */}
          <TouchableOpacity
            onPress={() => { setError(''); setStep(2); }}
            disabled={!step1Valid}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.primary,
              height: 52,
              borderRadius: BorderRadius.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: step1Valid ? 1 : 0.4,
              gap: 8,
              marginBottom: Spacing.xl,
            }}
          >
            <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Login link */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
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
              <Ionicons name="log-in-outline" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── STEP 2 — Plan Selection ────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingVertical: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back to step 1 */}
        <TouchableOpacity
          onPress={() => { setError(''); setStep(1); }}
          style={{
            alignSelf: 'flex-start',
            padding: 10,
            borderRadius: BorderRadius.md,
            backgroundColor: colors.surfaceElevated,
            marginBottom: Spacing.xl,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              backgroundColor: `${colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: `${colors.primary}40`,
            }}
          >
            <Ionicons name="pricetags" size={30} color={colors.primary} />
          </View>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.text }}>Choose a Plan</Text>
          <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
            Step 2 of 2 — Select your subscription
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
          <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
          <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.primary }} />
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

        {/* Plan cards */}
        <View style={{ gap: 14, marginBottom: 28 }}>
          {PLANS.map(plan => {
            const isSelected = selectedPlan === plan.tier
            return (
              <TouchableOpacity
                key={plan.tier}
                activeOpacity={0.7}
                onPress={() => setSelectedPlan(plan.tier)}
                style={{
                  borderRadius: BorderRadius.xl,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? plan.color : colors.border,
                  backgroundColor: isSelected ? `${plan.color}10` : colors.surface,
                  padding: 18,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: `${plan.color}20`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name={plan.icon} size={22} color={plan.color} />
                    </View>
                    <View>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.text }}>
                        {plan.name}
                      </Text>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: plan.color }}>
                        {plan.price}
                        <Text style={{ fontWeight: '400', color: colors.textMuted }}>/month</Text>
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? plan.color : colors.border,
                      backgroundColor: isSelected ? plan.color : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </View>

                <View style={{ marginTop: 12, gap: 6 }}>
                  {plan.features.map(f => (
                    <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={14} color={plan.color} />
                      <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>{f}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Create Account button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={isLoading || !selectedPlan}
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
              <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Creating account…</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Create Account</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
