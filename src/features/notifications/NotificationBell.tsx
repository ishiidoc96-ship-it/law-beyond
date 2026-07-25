import { useState } from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import NotificationsDropdown from './NotificationsDropdown'

export default function NotificationBell() {
  const { unread } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary transition-all relative"
      >
        <span className="material-symbols-outlined text-[22px]">
          {unread > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center px-1 animate-in fade-in">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && <NotificationsDropdown onClose={() => setOpen(false)} />}
    </div>
  )
}
