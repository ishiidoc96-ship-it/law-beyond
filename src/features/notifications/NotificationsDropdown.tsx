import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { getNotifications, markAsRead, markAllAsRead, type DbNotification } from '../../lib/api'
import { timeAgo, TYPE_ICONS } from '../../lib/notifications'
import { toast } from 'sonner'

export default function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { refreshUnread } = useNotifications()
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    getNotifications(user.id, 20).then(({ data, error }) => {
      if (error) {
        toast.error('Failed to load notifications')
        setLoading(false)
        return
      }
      setNotifications(data || [])
      setLoading(false)
    })
  }, [user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleMarkAllRead = async () => {
    if (!user) return
    const { error } = await markAllAsRead(user.id)
    if (error) {
      toast.error('Failed to mark as read')
      return
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    refreshUnread()
  }

  const handleClick = async (notif: DbNotification) => {
    if (!notif.read) {
      const { error } = await markAsRead(notif.id)
      if (!error) {
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
        refreshUnread()
      }
    }
    onClose()
    if (notif.link) navigate(notif.link)
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-surface rounded-2xl shadow-ambient-lg border border-outline-variant/30 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
        <h3 className="font-label-lg text-label-lg text-on-surface font-semibold">Notifications</h3>
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[380px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary animate-spin text-[28px]">progress_activity</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 px-6">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3 block">notifications_none</span>
            <p className="font-body-md text-body-md text-on-surface-variant">No notifications yet</p>
          </div>
        ) : (
          notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0 ${
                !notif.read ? 'bg-primary/5' : ''
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                !notif.read ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                <span className="material-symbols-outlined text-[18px]">
                  {TYPE_ICONS[notif.type] || 'notifications'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-body-sm text-body-sm leading-snug ${
                  !notif.read ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                }`}>
                  {notif.body}
                </p>
                <p className="font-label-xs text-label-xs text-on-surface-variant/60 mt-1">
                  {timeAgo(notif.created_at)}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-2" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-outline-variant/30 px-5 py-3">
          <button
            onClick={() => { onClose(); navigate('/notifications') }}
            className="w-full text-center font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors py-1"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}
