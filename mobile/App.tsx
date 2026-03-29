import React, { useEffect, useRef, useState } from 'react'
import { StatusBar, View, ActivityIndicator, Linking, Alert } from 'react-native'
import { NavigationContainer, DefaultTheme, DarkTheme, NavigationContainerRef } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { BadgeProvider } from './src/contexts/BadgeContext'
import { AuthNavigator, MainNavigator } from './src/navigation'
import { OnboardingWizardScreen } from './src/screens/OnboardingWizardScreen'
import { PermissionsGate } from './src/components/PermissionsGate'
import { Colors } from './src/constants/theme'
import { registerForPushNotifications, addNotificationListeners } from './src/lib/notifications'
import { api } from './src/lib/api'

function AppContent() {
  const { isDark, colors } = useTheme()
  const { isLoggedIn, isLoading, session } = useAuth()
  const navigationRef = useRef<NavigationContainerRef<any>>(null)
  const [permissionsChecked, setPermissionsChecked] = useState(false)

  // Handle deep link returns from Paystack payment (raven://payment-callback)
  // The OnboardingWizardScreen already polls for payment status every 5s,
  // so bringing the app back to the foreground is enough.
  useEffect(() => {
    const handleUrl = (_event: { url: string }) => {
      // No action needed — the polling in OnboardingWizardScreen detects payment
    }

    const sub = Linking.addEventListener('url', handleUrl)

    // Also handle cold-start deep links
    Linking.getInitialURL().catch(() => null)

    return () => sub.remove()
  }, [])

  // Register for push notifications and set up deep-link navigation
  useEffect(() => {
    if (!isLoggedIn) return

    // Register FCM token with backend
    registerForPushNotifications().catch(() => {})

    // Set up notification listeners
    const cleanup = addNotificationListeners(
      // Foreground notification received
      (notification) => {
        const data = notification.request.content.data as Record<string, string> | undefined
        if (data?.type === 'takeover_prompt' && data?.conversationId) {
          // Show in-app takeover prompt alert
          Alert.alert(
            '🤖 Bot Ready to Resume',
            notification.request.content.body ?? 'Would you like the bot to take over this chat?',
            [
              {
                text: 'Not Yet',
                style: 'cancel',
                onPress: () => {
                  api(`/api/messaging/conversations/${data.conversationId}/takeover-decline`, {
                    method: 'POST',
                  }).catch(() => {})
                },
              },
              {
                text: 'Activate Bot',
                onPress: () => {
                  api(`/api/messaging/conversations/${data.conversationId}/takeover-accept`, {
                    method: 'POST',
                  }).catch(() => {})
                },
              },
            ],
          )
        }
      },
      // Notification tapped — navigate to the relevant conversation
      (response) => {
        const data = response.notification.request.content.data as Record<string, string> | undefined
        if (data?.conversationId && navigationRef.current) {
          const nav = navigationRef.current
          // Navigate to the Chats tab, then into the specific Chat screen
          nav.navigate('Chats', {
            screen: 'Chat',
            params: {
              conversationId: data.conversationId,
              name: data.customerPhone ? `Customer ${data.customerPhone.slice(-4)}` : 'Customer',
              customerPhone: data.customerPhone,
            },
          })
        }
      },
    )

    return cleanup
  }, [isLoggedIn])

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.header,
          border: colors.border,
          text: colors.text,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.header,
          border: colors.border,
          text: colors.text,
          primary: colors.primary,
        },
      }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent
      />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {!isLoggedIn
          ? <AuthNavigator />
          : !session?.onboardingCompleted
            ? <OnboardingWizardScreen />
            : !permissionsChecked
              ? <PermissionsGate onAllGranted={() => setPermissionsChecked(true)} />
              : <MainNavigator />
        }
      </NavigationContainer>
    </>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BadgeProvider>
              <AppContent />
            </BadgeProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
