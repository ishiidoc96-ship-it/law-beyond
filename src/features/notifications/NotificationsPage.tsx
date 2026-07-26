import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { getNotifications, markAsRead, markAllAsRead, type DbNotification } from '../../lib/api'

const typeIcon: Record<string, string> = {
  like: 'favorite',
  comment: 'comment',
  friend_request: 'person_add',
  friend_accept: 'group',
  streak: 'local_fire_department',
  habit: 'check_circle',
  task: 'task_alt',
  reminder: 'alarm',
  system: 'info',
}

const typeColor: Record<string, string> = {
  like: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  comment: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  friend_request: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  friend_accept: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  streak: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { refreshUnread } = useNotifications()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    setLoading(true)
    getNotifications(user.uid).then(({ data }) => {
      setNotifications(data || [])
      setLoading(false)
    })
  }, [user?.uid])

  async function handleMarkAllRead() {
    if (!user?.uid) return
    await markAllAsRead(user.uid)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    refreshUnread()
  }

  async function handleClick(n: DbNotification) {
    if (!n.read) {
      await markAsRead(n.id)
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))
      refreshUnread()
    }
    if (n.link) navigate(n.link)
  }

  const unread = notifications.filter((n) => !n.read)

  return (
    <div className="space-y-4 pb-24 md:pb-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-on-surface text-2xl font-bold">Notifications</h1>
          {unread.length > 0 && (
            <p className="text-on-surface-variant text-sm mt-0.5">{unread.length} unread</p>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-high">
              <div className="w-10 h-10 skeleton rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 skeleton w-2/3 rounded" />
                <div className="h-3 skeleton w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant empty-state-icon">
          <span className="material-symbols-outlined text-6xl mb-3 opacity-30">notifications_none</span>
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1 opacity-60">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-3 p-4 rounded-2xl text-left transition-all duration-200 card-hover ${
                !n.read
                  ? 'bg-primary/5 border border-primary/10'
                  : 'bg-surface-container-high border border-outline-variant/10'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                typeColor[n.type] || 'bg-surface-container text-on-surface-variant'
              }`}>
                <span className="material-symbols-outlined text-lg">
                  {typeIcon[n.type] || 'notifications'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-on-surface-variant/70 mt-0.5">{n.body}</p>
                <p className="text-[10px] text-on-surface-variant/50 mt-1.5">
                  {new Date(n.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              {!n.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
