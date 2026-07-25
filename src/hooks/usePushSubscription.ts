import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeToPush } from '../lib/notify'

export function usePushSubscription() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    if (Notification.permission === 'granted') {
      subscribeToPush(user.id).catch(() => {})
    }
  }, [user])
}
