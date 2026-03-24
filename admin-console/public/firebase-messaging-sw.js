// firebase-messaging-sw.js — Admin Console service worker
// Handles background FCM push notifications for new_tenant, alert, broadcast events.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    const config = event.data.config
    if (!firebase.apps.length) {
      firebase.initializeApp(config)
    }
    const messaging = firebase.messaging()

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? 'Raven Admin'
      const body = payload.notification?.body ?? ''
      const data = payload.data ?? {}

      self.registration.showNotification(title, {
        body,
        icon: '/logo.png',
        badge: '/badge-72.png',
        data,
        requireInteraction: true,
        tag: data.type ?? 'admin-notification',
      })
    })
  }
})
