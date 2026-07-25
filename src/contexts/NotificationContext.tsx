import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getUnreadCount } from '../lib/api'
import { pb } from '../lib/pb'

interface NotificationContextValue {
  unread: number
  refreshUnread: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue>({ unread: 0, refreshUnread: async () => {} })

export function useNotifications() {
  return useContext(NotificationContext)
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  const refreshUnread = useCallback(async () => {
    if (!user) { setUnread(0); return }
    const { count } = await getUnreadCount(user.id)
    setUnread(count)
  }, [user])

  useEffect(() => {
    if (!user) { setUnread(0); return }

    refreshUnread()

    // Subscribe to real-time notifications via PocketBase
    let unsubscribe: (() => void) | undefined

    pb.collection('notifications').subscribe('*', () => {
      refreshUnread()
    }).then((unsub) => {
      unsubscribe = unsub
    }).catch(() => {
      // Realtime subscription failed - fall back to polling
    })

    return () => { unsubscribe?.() }
  }, [user, refreshUnread])

  return (
    <NotificationContext.Provider value={{ unread, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  )
}
