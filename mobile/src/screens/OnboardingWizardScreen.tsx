import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { api, apiUpload } from '../lib/api'
import { Spacing, FontSize, BorderRadius } from '../constants/theme'

type WizardStep = 'welcome' | 'payment' | 'profile' | 'whatsapp' | 'done'

const STEP_ORDER: WizardStep[] = ['welcome', 'payment', 'profile', 'whatsapp', 'done']

const INDUSTRIES = [
  'Restaurant / Food',
  'Hotel / Hospitality',
  'Retail',
  'Healthcare',
  'E-commerce',
  'Professional Services',
  'Other',
]

const META_KEYS = [
  {
    key: 'META_APP_SECRET',
    label: 'App Secret',
    placeholder: 'abc123…',
    help: 'App Settings → Basic → App Secret in Meta Developer Console',
  },
  {
    key: 'META_WEBHOOK_VERIFY_TOKEN',
    label: 'Webhook Verify Token',
    placeholder: 'raven-verify-…',
    help: 'Pre-filled token — use this when configuring your Meta webhook',
  },
  {
    key: 'META_ACCESS_TOKEN',
    label: 'Access Token',
    placeholder: 'EAABwz…',
    help: 'Business Settings → System Users → Generate Token (whatsapp_business_messaging)',
  },
  {
    key: 'META_PHONE_NUMBER_ID',
    label: 'Phone Number ID',
    placeholder: '1234567890',
    help: 'WhatsApp → API Setup → Phone Number ID',
  },
]

export function OnboardingWizardScreen() {
  const { colors } = useTheme()
  const { session, refreshSession, markOnboardingComplete } = useAuth()
  const insets = useSafeAreaInsets()

  const [step, setStep] = useState<WizardStep>('welcome')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Payment data
  const [planName, setPlanName] = useState('')
  const [planAmount, setPlanAmount] = useState(0)
  const [planTier, setPlanTier] = useState('')
  const [paymentPending, setPaymentPending] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  // Profile data
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [showIndustryPicker, setShowIndustryPicker] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [website, setWebsite] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#10b981')
  const [logoUrl, setLogoUrl] = useState('')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // WhatsApp keys
  const [metaKeys, setMetaKeys] = useState<Record<string, string>>({
    META_APP_SECRET: '',
    META_WEBHOOK_VERIFY_TOKEN: '',
    META_ACCESS_TOKEN: '',
    META_PHONE_NUMBER_ID: '',
  })
  const [openaiKey, setOpenaiKey] = useState('')
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null)
  const [isSavingKeys, setIsSavingKeys] = useState(false)

  // Done step
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // ── Resume logic ────────────────────────────────────────────────────────

  const checkPaymentStatus = useCallback(async () => {
    try {
      const res = await api<{
        subscriptionStatus: string
        planName: string
        amountKobo: number
        planTier: string
        onboardingStep: string | null
        onboardingCompleted: boolean
      }>('/api/subscription/payment/status')

      setPlanName(res.planName || '')
      setPlanAmount(res.amountKobo || 0)
      setPlanTier(res.planTier || '')

      if (res.onboardingCompleted) {
        // Already done — refresh session which will flip the flag
        await refreshSession()
        return
      }

      if (res.subscriptionStatus !== 'active') {
        setStep('payment')
      } else if (res.onboardingStep && STEP_ORDER.includes(res.onboardingStep as WizardStep)) {
        // Resume at saved step (but at least profile since payment is done)
        const idx = STEP_ORDER.indexOf(res.onboardingStep as WizardStep)
        setStep(idx >= 2 ? (res.onboardingStep as WizardStep) : 'profile')
      } else {
        setStep('profile')
      }

      // Pre-fill verify token with tenant ID prefix
      if (session?.tenant?.id) {
        setMetaKeys(prev => ({
          ...prev,
          META_WEBHOOK_VERIFY_TOKEN: prev.META_WEBHOOK_VERIFY_TOKEN || `raven-verify-${session.tenant!.id.slice(0, 8)}`,
        }))
      }
    } catch {
      // On error just show welcome
      setStep('welcome')
    } finally {
      setLoading(false)
    }
  }, [session, refreshSession])

  useEffect(() => {
    checkPaymentStatus()
  }, [checkPaymentStatus])

  // Re-check payment status when app comes to foreground
  useEffect(() => {
    if (!paymentPending) return
    const interval = setInterval(async () => {
      try {
        const res = await api<{ subscriptionStatus: string }>('/api/subscription/payment/status')
        if (res.subscriptionStatus === 'active') {
          setPaymentPending(false)
          persistStep('profile')
          setStep('profile')
          clearInterval(interval)
        }
      } catch {
        // ignore
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [paymentPending])

  // ── Step persistence ────────────────────────────────────────────────────

  async function persistStep(s: WizardStep) {
    try {
      await api('/api/onboarding/step', { method: 'POST', body: { step: s } })
    } catch {
      // non-critical
    }
  }

  // ── Payment ─────────────────────────────────────────────────────────────

  async function handleInitPayment() {
    setIsInitializing(true)
    setError('')
    try {
      const res = await api<{ authorizationUrl: string; already_paid?: boolean }>(
        '/api/subscription/payment/initialize',
        { method: 'POST', body: { platform: 'mobile' } },
      )
      if (res.already_paid) {
        persistStep('profile')
        setStep('profile')
        return
      }
      if (res.authorizationUrl) {
        setPaymentPending(true)
        await Linking.openURL(res.authorizationUrl)
      }
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to initialize payment')
    } finally {
      setIsInitializing(false)
    }
  }

  // ── Logo upload ─────────────────────────────────────────────────────────

  async function handlePickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to photos to upload a logo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]) return

    setIsUploadingLogo(true)
    try {
      const asset = result.assets[0]
      const fd = new FormData()
      const ext = asset.uri.split('.').pop() || 'jpg'
      fd.append('file', {
        uri: asset.uri,
        name: `logo.${ext}`,
        type: asset.mimeType || `image/${ext}`,
      } as any)
      const res = await apiUpload<{ logoUrl: string }>('/tenant/branding/upload/logo', fd)
      setLogoUrl(res.logoUrl)
    } catch {
      Alert.alert('Error', 'Failed to upload logo')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // ── Save profile ────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!businessName.trim() || !whatsappNumber.trim()) {
      setError('Business name and WhatsApp number are required')
      return
    }
    setIsSavingProfile(true)
    setError('')
    try {
      await api('/tenant/branding', {
        method: 'POST',
        body: {
          name: businessName.trim(),
          logoUrl: logoUrl || undefined,
          primaryColor,
          whatsappNumber: whatsappNumber.trim(),
        },
      })
      // Save optional extras
      if (industry || website.trim()) {
        try {
          await api('/tenant/branding/extra', {
            method: 'POST',
            body: { industry, website: website.trim() || undefined },
          })
        } catch {
          // non-critical
        }
      }
      persistStep('whatsapp')
      setStep('whatsapp')
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to save profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ── Save keys ───────────────────────────────────────────────────────────

  async function handleSaveKeys() {
    const requiredMissing = META_KEYS.filter(k => !metaKeys[k.key]?.trim())
    if (requiredMissing.length > 0) {
      setError(`Fill in: ${requiredMissing.map(k => k.label).join(', ')}`)
      return
    }
    setIsSavingKeys(true)
    setError('')
    try {
      const keys = [
        ...META_KEYS.map(k => ({ key: k.key, value: metaKeys[k.key].trim() })),
      ]
      if (openaiKey.trim()) keys.push({ key: 'OPENAI_API_KEY', value: openaiKey.trim() })

      await api('/api/settings/keys', {
        method: 'POST',
        body: { keys },
      })
      persistStep('done')
      setStep('done')
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to save keys')
    } finally {
      setIsSavingKeys(false)
    }
  }

  function handleSkipKeys() {
    persistStep('done')
    setStep('done')
  }

  // ── Complete onboarding ─────────────────────────────────────────────────

  async function handleComplete() {
    if (!termsAccepted) return
    setIsCompleting(true)
    setError('')
    try {
      await api('/api/onboarding/complete', { method: 'POST' })
      await markOnboardingComplete()
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Failed to complete setup')
    } finally {
      setIsCompleting(false)
    }
  }

  // ── Shared styles ───────────────────────────────────────────────────────

  const inputStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 50,
  }

  const stepIdx = STEP_ORDER.indexOf(step)

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 12 }}>Loading…</Text>
      </View>
    )
  }

  // ── Step Header ─────────────────────────────────────────────────────────

  function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <View style={{ marginBottom: 24 }}>
        {/* Progress bar */}
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 20 }}>
          {STEP_ORDER.map((_, i) => (
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
        <Text style={{ fontSize: FontSize.xs, color: colors.primary, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Step {stepIdx + 1} of {STEP_ORDER.length}
        </Text>
        <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: 6 }}>{title}</Text>
        <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20 }}>{subtitle}</Text>
      </View>
    )
  }

  // ── Error Banner ────────────────────────────────────────────────────────

  function ErrorBanner() {
    if (!error) return null
    return (
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
    )
  }

  // ── InfoCard ────────────────────────────────────────────────────────────

  function InfoCard({ icon, color, title, desc }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; desc: string }) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          borderRadius: BorderRadius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: `${color}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.text }}>{title}</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>{desc}</Text>
        </View>
      </View>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STEP: WELCOME
  // ═════════════════════════════════════════════════════════════════════════

  if (step === 'welcome') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 28, paddingTop: insets.top + 40, paddingBottom: 40 }}
      >
        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: `${colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              borderWidth: 1.5,
              borderColor: `${colors.primary}40`,
            }}
          >
            <Ionicons name="sparkles" size={40} color={colors.primary} />
          </View>
          <Text style={{ fontSize: FontSize.xxxl, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
            Welcome to Raven
          </Text>
          <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Let's get your business set up in just a few steps
          </Text>
        </View>

        {/* Info cards */}
        <View style={{ gap: 12, marginBottom: 36 }}>
          <InfoCard
            icon="card-outline"
            color="#6366f1"
            title="Activate your subscription"
            desc="Quick secure payment via Paystack"
          />
          <InfoCard
            icon="business-outline"
            color="#f49617"
            title="Set up your business profile"
            desc="Name, logo, contact info, and brand color"
          />
          <InfoCard
            icon="logo-whatsapp"
            color="#22c55e"
            title="Connect WhatsApp & AI"
            desc="Enter your Meta API credentials"
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => { persistStep('payment'); setStep('payment'); }}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            height: 56,
            borderRadius: BorderRadius.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '700' }}>Let's get started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STEP: PAYMENT
  // ═════════════════════════════════════════════════════════════════════════

  if (step === 'payment') {
    const amountDisplay = planAmount > 0 ? `₦${(planAmount / 100).toLocaleString()}` : '—'
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 28, paddingTop: insets.top + 20, paddingBottom: 40 }}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => setStep('welcome')}
          style={{ alignSelf: 'flex-start', padding: 10, borderRadius: BorderRadius.md, backgroundColor: colors.surfaceElevated, marginBottom: Spacing.lg }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <StepHeader title="Activate Subscription" subtitle="Complete your payment to unlock all features" />
        <ErrorBanner />

        {/* Plan card */}
        <View
          style={{
            borderRadius: BorderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: `${colors.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="diamond" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>
                {planName || planTier || 'Your Plan'}
              </Text>
              <Text style={{ fontSize: FontSize.xxl, fontWeight: '800', color: colors.primary }}>
                {amountDisplay}
                <Text style={{ fontSize: FontSize.sm, fontWeight: '400', color: colors.textMuted }}>/month</Text>
              </Text>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Full WhatsApp bot automation</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Order & payment management</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}>Real-time analytics & insights</Text>
            </View>
          </View>
        </View>

        {/* Payment info */}
        {paymentPending && (
          <View
            style={{
              backgroundColor: `${colors.info}15`,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: Spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: `${colors.info}30`,
            }}
          >
            <ActivityIndicator size="small" color={colors.info} />
            <Text style={{ color: colors.info, fontSize: FontSize.sm, flex: 1 }}>
              Waiting for payment confirmation… Complete payment in your browser, then return here.
            </Text>
          </View>
        )}

        {/* Pay button */}
        <TouchableOpacity
          onPress={handleInitPayment}
          disabled={isInitializing}
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.primary,
            height: 56,
            borderRadius: BorderRadius.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: isInitializing ? 0.7 : 1,
          }}
        >
          {isInitializing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Initializing…</Text>
            </>
          ) : (
            <>
              <Ionicons name="card" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>
                {paymentPending ? 'Retry Payment' : 'Pay with Paystack'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STEP: PROFILE
  // ═════════════════════════════════════════════════════════════════════════

  if (step === 'profile') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 28, paddingTop: insets.top + 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => setStep('payment')}
            style={{ alignSelf: 'flex-start', padding: 10, borderRadius: BorderRadius.md, backgroundColor: colors.surfaceElevated, marginBottom: Spacing.lg }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <StepHeader title="Business Profile" subtitle="Tell us about your business so we can personalize your experience" />
          <ErrorBanner />

          {/* Business Name */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Business name <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View style={inputStyle}>
              <Ionicons name="business-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Mama Cass Kitchen"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Industry */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Industry
            </Text>
            <TouchableOpacity
              onPress={() => setShowIndustryPicker(!showIndustryPicker)}
              style={[inputStyle, { justifyContent: 'space-between' }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />
                <Text style={{ color: industry ? colors.text : colors.textMuted, fontSize: FontSize.md }}>
                  {industry || 'Select industry'}
                </Text>
              </View>
              <Ionicons name={showIndustryPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {showIndustryPicker && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: BorderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginTop: 6,
                  overflow: 'hidden',
                }}
              >
                {INDUSTRIES.map(ind => (
                  <TouchableOpacity
                    key={ind}
                    onPress={() => { setIndustry(ind); setShowIndustryPicker(false); }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: industry === ind ? `${colors.primary}15` : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ color: industry === ind ? colors.primary : colors.text, fontSize: FontSize.sm, fontWeight: industry === ind ? '600' : '400' }}>
                      {ind}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Logo */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Logo
            </Text>
            <TouchableOpacity
              onPress={handlePickLogo}
              disabled={isUploadingLogo}
              style={{
                borderRadius: BorderRadius.lg,
                borderWidth: 1.5,
                borderColor: colors.border,
                borderStyle: 'dashed',
                padding: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
            >
              {isUploadingLogo ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : logoUrl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                  <Text style={{ color: '#22c55e', fontSize: FontSize.sm, fontWeight: '600' }}>Logo uploaded</Text>
                  <Text style={{ color: colors.primary, fontSize: FontSize.xs }}>Change</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: FontSize.sm }}>Tap to upload logo</Text>
                  <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>JPG, PNG, SVG, WEBP — max 5 MB</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* WhatsApp Number */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              WhatsApp number <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View style={inputStyle}>
              <Ionicons name="logo-whatsapp" size={18} color="#22c55e" style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                placeholder="+2348012345678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Website */}
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Website
            </Text>
            <View style={inputStyle}>
              <Ionicons name="globe-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.md }}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://mybusiness.ng"
                placeholderTextColor={colors.textMuted}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Primary Color */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>
              Brand color
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {['#10b981', '#6366f1', '#f49617', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'].map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setPrimaryColor(c)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: c,
                    borderWidth: primaryColor === c ? 3 : 0,
                    borderColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {primaryColor === c && <Ionicons name="checkmark" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Continue */}
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={isSavingProfile}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.primary,
              height: 52,
              borderRadius: BorderRadius.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: isSavingProfile ? 0.7 : 1,
            }}
          >
            {isSavingProfile ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Saving…</Text>
              </>
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STEP: WHATSAPP & AI KEYS
  // ═════════════════════════════════════════════════════════════════════════

  if (step === 'whatsapp') {
    const allMetaFilled = META_KEYS.every(k => metaKeys[k.key]?.trim())
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 28, paddingTop: insets.top + 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => setStep('profile')}
            style={{ alignSelf: 'flex-start', padding: 10, borderRadius: BorderRadius.md, backgroundColor: colors.surfaceElevated, marginBottom: Spacing.lg }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <StepHeader title="WhatsApp & AI" subtitle="Connect your Meta credentials to activate the WhatsApp bot" />
          <ErrorBanner />

          {/* Webhook URL info */}
          <View
            style={{
              backgroundColor: `${colors.info}10`,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: `${colors.info}25`,
            }}
          >
            <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: colors.info, marginBottom: 4 }}>
              Webhook URL (use in Meta console)
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }} selectable>
              https://api.raven-ai.online/api/messaging/webhook/whatsapp
            </Text>
          </View>

          {/* Meta keys */}
          <View style={{ gap: 16, marginBottom: 20 }}>
            {META_KEYS.map(mk => (
              <View key={mk.key}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary }}>
                    {mk.label} <Text style={{ color: colors.error }}>*</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setExpandedHelp(expandedHelp === mk.key ? null : mk.key)}>
                    <Ionicons name="help-circle-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {expandedHelp === mk.key && (
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: BorderRadius.sm,
                      padding: Spacing.sm,
                      marginBottom: 6,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, lineHeight: 18 }}>{mk.help}</Text>
                  </View>
                )}
                <View style={inputStyle}>
                  <Ionicons name="key-outline" size={16} color={colors.textMuted} style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: FontSize.sm }}
                    value={metaKeys[mk.key]}
                    onChangeText={val => setMetaKeys(prev => ({ ...prev, [mk.key]: val }))}
                    placeholder={mk.placeholder}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* OpenAI key (optional) */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
              OpenAI API Key <Text style={{ color: colors.textMuted, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <View style={inputStyle}>
              <Ionicons name="sparkles-outline" size={16} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, color: colors.text, fontSize: FontSize.sm }}
                value={openaiKey}
                onChangeText={setOpenaiKey}
                placeholder="sk-…"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={{ fontSize: FontSize.xs, color: colors.textMuted, marginTop: 4, marginLeft: 4 }}>
              Powers the AI bot responses. Get yours at platform.openai.com
            </Text>
          </View>

          {/* Save keys */}
          <TouchableOpacity
            onPress={handleSaveKeys}
            disabled={isSavingKeys || !allMetaFilled}
            activeOpacity={0.8}
            style={{
              backgroundColor: colors.primary,
              height: 52,
              borderRadius: BorderRadius.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: (isSavingKeys || !allMetaFilled) ? 0.5 : 1,
              marginBottom: Spacing.md,
            }}
          >
            {isSavingKeys ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Saving…</Text>
              </>
            ) : (
              <>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' }}>Save & Continue</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            onPress={handleSkipKeys}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              gap: 6,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: FontSize.sm }}>Skip for now — I'll add these later</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════
  // STEP: DONE
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 28, paddingTop: insets.top + 40, paddingBottom: 40 }}
    >
      {/* Hero */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <Text style={{ fontSize: 56, marginBottom: 16 }}>🎉</Text>
        <Text style={{ fontSize: FontSize.xxxl, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
          You're all set!
        </Text>
        <Text style={{ fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          Your Raven workspace is ready. Here's what you can do next:
        </Text>
      </View>

      {/* Progress bar — full */}
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 28 }}>
        {STEP_ORDER.map((_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.primary }}
          />
        ))}
      </View>

      {/* Next steps */}
      <View style={{ gap: 12, marginBottom: 28 }}>
        <InfoCard
          icon="logo-whatsapp"
          color="#22c55e"
          title="WhatsApp bot is live"
          desc="Send a test message to your connected number"
        />
        <InfoCard
          icon="restaurant-outline"
          color="#f49617"
          title="Add menu items"
          desc="Set up your product catalogue for ordering"
        />
        <InfoCard
          icon="megaphone-outline"
          color="#6366f1"
          title="Send a broadcast"
          desc="Announce your launch to all customers"
        />
        <InfoCard
          icon="bar-chart-outline"
          color="#3b82f6"
          title="Watch analytics"
          desc="See real-time conversation and order data"
        />
      </View>

      <ErrorBanner />

      {/* Terms */}
      <TouchableOpacity
        onPress={() => setTermsAccepted(!termsAccepted)}
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 24,
          padding: 16,
          borderRadius: BorderRadius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: termsAccepted ? colors.primary : colors.border,
        }}
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
          I accept the{' '}
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
          . Message processing is handled by RBA AI assistant.
        </Text>
      </TouchableOpacity>

      {/* Complete */}
      <TouchableOpacity
        onPress={handleComplete}
        disabled={isCompleting || !termsAccepted}
        activeOpacity={0.8}
        style={{
          backgroundColor: colors.primary,
          height: 56,
          borderRadius: BorderRadius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: (!termsAccepted || isCompleting) ? 0.5 : 1,
        }}
      >
        {isCompleting ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '700' }}>Finishing…</Text>
          </>
        ) : (
          <>
            <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '700' }}>Let's go!</Text>
            <Text style={{ fontSize: 18 }}>🚀</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  )
}
