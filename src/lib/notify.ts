import { pb } from './pb'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

// ── Permission ──
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

// ── Subscribe to push ──
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY not set — push notifications disabled')
    return false
  }

  try {
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const json = subscription.toJSON()
    const endpoint = json.endpoint || ''
    const p256dh = (json.keys?.p256dh as string) || ''
    const auth = (json.keys?.auth as string) || ''

    // Save to PocketBase push_subscriptions collection
    const { data: existing } = await pb.collection('push_subscriptions').getList(1, 1, {
      filter: `user = "${userId}" && endpoint = "${endpoint}"`,
    })

    if (existing.items.length > 0) {
      await pb.collection('push_subscriptions').update(existing.items[0].id, { p256dh, auth_key: auth })
    } else {
      await pb.collection('push_subscriptions').create({ user: userId, endpoint, p256dh, auth_key: auth })
    }

    return true
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}

// ── Unsubscribe from push ──
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return false

    const endpoint = subscription.endpoint

    // Remove from PocketBase
    const { data: existing } = await pb.collection('push_subscriptions').getList(1, 1, {
      filter: `user = "${userId}" && endpoint = "${endpoint}"`,
    })

    if (existing.items.length > 0) {
      await pb.collection('push_subscriptions').delete(existing.items[0].id)
    }

    await subscription.unsubscribe()
    return true
  } catch (err) {
    console.error('Push unsubscribe failed:', err)
    return false
  }
}

// ── Check if push is subscribed ──
export async function isPushSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
