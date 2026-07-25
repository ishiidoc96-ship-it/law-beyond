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

interface Props {
  onClose: () => void
}

export default function NotificationsDropdown({ onClose }: Props) {
  const { user } = useAuth()
  const { refreshUnread } = useNotifications()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    getNotifications(user.id, 20).then(({ data }) => {
      setNotifications(data || [])
      setLoading(false)
    })
  }, [user?.id, refreshUnread])

  async function handleMarkAllRead() {
    if (!user?.id) return
    await markAllAsRead(user.id)
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
    onClose()
  }

  const unread = notifications.filter((n) => !n.read)

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
        <div>
          <h3 className="font-semibold text-on-surface text-sm">Notifications</h3>
          {unread.length > 0 && (
            <p className="text-xs text-on-surface-variant mt-0.5">{unread.length} unread</p>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 skeleton rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 skeleton w-3/4 rounded" />
                  <div className="h-3 skeleton w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-40">notifications_none</span>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-high ${
                !n.read ? 'bg-primary/5' : ''
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                !n.read ? 'bg-primary/10' : 'bg-surface-container'
              }`}>
                <span className="material-symbols-outlined text-[18px] text-primary">
                  {typeIcon[n.type] || 'notifications'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-on-surface-variant/70 mt-0.5 truncate">{n.body}</p>
                <p className="text-[10px] text-on-surface-variant/50 mt-1">
                  {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 animate-badge-bounce" />
              )}
            </button>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="border-t border-outline-variant/20 px-4 py-2.5">
          <button
            onClick={() => { navigate('/notifications'); onClose() }}
            className="w-full text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
