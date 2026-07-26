import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getUnreadCount } from '../lib/api'

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
    const { count } = await getUnreadCount(user.uid)
    setUnread(count)
  }, [user])

  useEffect(() => {
    if (!user) { setUnread(0); return }
    // Poll for unread notifications every 30 seconds
    refreshUnread()
    const interval = setInterval(refreshUnread, 30000)
    return () => clearInterval(interval)
  }, [user, refreshUnread])

  return (
    <NotificationContext.Provider value={{ unread, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  )
}
