import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache all assets built by vite
precacheAndRoute((self as any).__WB_MANIFEST)
cleanupOutdatedCaches()

// Cloudinary images — cache first (7 days)
registerRoute(
  ({ url }: { url: URL }) => url.origin === 'res.cloudinary.com',
  new CacheFirst({
    cacheName: 'cloudinary-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 86400 * 7 }),
    ],
  })
)

// Supabase API — network first (1 hour cache)
registerRoute(
  ({ url }: { url: URL }) => url.hostname.includes('supabase'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 3600 }),
    ],
  })
)

// Google Fonts — stale while revalidate
registerRoute(
  ({ url }: { url: URL }) =>
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts' })
)

// ── Push Notifications ──
self.addEventListener('push', (event: any) => {
  if (!event.data) return

  let payload = { title: 'Future Lawyer', body: '', icon: '/icons/icon-512.png', url: '/', tag: '', badge: '' }

  try {
    const data = event.data.json()
    payload = {
      title: data.title || payload.title,
      body: data.body || payload.body,
      icon: data.icon || payload.icon,
      url: data.url || data.link || payload.url,
      tag: data.tag || '',
      badge: data.badge || '/icons/icon-512.png',
    }
  } catch {
    payload.body = event.data.text()
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    vibrate: [100, 50, 100, 50, 200],
    data: { url: payload.url },
    tag: payload.tag || 'law-beyond-notification',
    renotify: true,
  }

  // Add actions based on notification type
  if (payload.url.includes('/streaks')) {
    ;(options as any).actions = [
      { action: 'open', title: 'View Streak' },
      { action: 'dismiss', title: 'Later' },
    ]
  } else {
    ;(options as any).actions = [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ]
  }

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients: any[]) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// ── Skip waiting and claim clients ──
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event: any) => {
  event.waitUntil(self.clients.claim())
})
