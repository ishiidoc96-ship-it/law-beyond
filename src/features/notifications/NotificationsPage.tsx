import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { getNotifications, markAsRead, markAllAsRead, type DbNotification } from '../../lib/api'
import { timeAgo, TYPE_ICONS, TYPE_COLORS } from '../../lib/notifications'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { refreshUnread } = useNotifications()
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const LIMIT = 30

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getNotifications(user.id, LIMIT).then(({ data, error }) => {
      if (error) {
        toast.error('Failed to load notifications')
        setLoading(false)
        return
      }
      setNotifications(data || [])
      setHasMore((data?.length || 0) === LIMIT)
      setLoading(false)
    })
  }, [user])

  const loadMore = async () => {
    if (!user || !hasMore) return
    const nextPage = page + 1
    const { data } = await getNotifications(user.id, LIMIT * nextPage)
    if (data) {
      setNotifications(data)
      setHasMore(data.length === LIMIT * nextPage)
      setPage(nextPage)
    }
  }

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
    if (notif.link) navigate(notif.link)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Notifications</h1>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full hover:bg-primary/5"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined text-primary animate-spin text-[36px]">progress_activity</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant/20 mb-4 block">notifications_none</span>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-2">No notifications yet</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant/60">
            When someone interacts with your posts, you'll see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all hover:shadow-sm ${
                !notif.read
                  ? 'bg-surface border border-primary/20 shadow-sm'
                  : 'bg-surface-container-low/50 hover:bg-surface-container-low border border-transparent'
              }`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                TYPE_COLORS[notif.type] || TYPE_COLORS.system
              }`}>
                <span className="material-symbols-outlined text-[20px]">
                  {TYPE_ICONS[notif.type] || 'notifications'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-label-md text-label-md text-on-surface mb-0.5">{notif.title}</p>
                <p className={`font-body-sm text-body-sm leading-relaxed ${
                  !notif.read ? 'text-on-surface' : 'text-on-surface-variant'
                }`}>
                  {notif.body}
                </p>
                <p className="font-label-xs text-label-xs text-on-surface-variant/50 mt-1.5">
                  {timeAgo(notif.created_at)}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              )}
            </button>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-center font-label-sm text-label-sm text-primary hover:text-primary/80 transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
