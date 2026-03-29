import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { api } from './api'

// Configure notification behaviour when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Register for push notifications and send the Expo push token
 * to the backend so it can forward via FCM.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators/emulators
    return null
  }

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CE7',
      enableVibrate: true,
      showBadge: true,
    })
  }

  // Get Expo push token (uses FCM under the hood for Android)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  })
  const token = tokenData.data

  // Send token to backend
  try {
    await api('/api/notifications/token', {
      method: 'POST',
      body: {
        token,
        platform: Platform.OS,
      },
    })
  } catch {
    // Non-critical — token will be re-sent on next launch
  }

  return token
}

/**
 * Listen for incoming notifications (foreground + tapped)
 */
export function addNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onTapped?: (response: Notifications.NotificationResponse) => void
) {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification)
  })

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onTapped?.(response)
  })

  return () => {
    receivedSub.remove()
    responseSub.remove()
  }
}
