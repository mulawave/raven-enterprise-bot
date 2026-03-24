// firebase-messaging-sw.js — must be served from the root (/public/)
// This file handles background push notifications when the tab is not focused.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// These values are injected at runtime via the service worker query string
// or you can hard-code them here if the project is public.
// Better: inject them via a separate config endpoint.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    const config = event.data.config
    if (!firebase.apps.length) {
      firebase.initializeApp(config)
    }
    const messaging = firebase.messaging()

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? 'Raven Alert'
      const body = payload.notification?.body ?? ''
      const data = payload.data ?? {}

      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data,
        requireInteraction: true,
        tag: data.type ?? 'raven-notification',
      })
    })
  }
})
