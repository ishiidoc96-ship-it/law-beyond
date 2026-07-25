import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import NotificationsDropdown from './NotificationsDropdown'

export default function NotificationBell() {
  const { unread } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const prevCount = useRef(unread)

  useEffect(() => {
    if (unread > prevCount.current) {
      const bell = ref.current?.querySelector('.bell-icon')
      bell?.classList.remove('animate-bell-pulse')
      void (bell as HTMLElement)?.offsetWidth // trigger reflow
      bell?.classList.add('animate-bell-pulse')
    }
    prevCount.current = unread
  }, [unread])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors duration-200"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <span className="bell-icon material-symbols-outlined text-[22px] text-on-surface-variant">
          notifications
        </span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-on-primary bg-error rounded-full animate-badge-bounce">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-hidden rounded-2xl bg-surface-container-high shadow-ambient-lg border border-outline-variant/20 animate-scale-in z-50">
          <NotificationsDropdown onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
