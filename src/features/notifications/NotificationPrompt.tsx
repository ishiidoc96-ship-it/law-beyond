import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { requestNotificationPermission, subscribeToPush, isPushSubscribed } from '../../lib/notify'

export default function NotificationPrompt() {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user || dismissed) return
    const key = `notif_prompt_dismissed_${user.id}`
    if (localStorage.getItem(key)) return
    isPushSubscribed().then(subscribed => {
      if (!subscribed) setVisible(true)
    })
  }, [user, dismissed])

  const handleEnable = async () => {
    if (!user) return
    setLoading(true)
    const granted = await requestNotificationPermission()
    if (granted === 'granted') {
      const ok = await subscribeToPush(user.id)
      if (ok) {
        setVisible(false)
        localStorage.setItem(`notif_prompt_dismissed_${user.id}`, '1')
      }
    }
    setLoading(false)
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    if (user) localStorage.setItem(`notif_prompt_dismissed_${user.id}`, '1')
  }

  if (!visible) return null

  return (
    <div className="mb-6 bg-gradient-to-r from-primary/10 via-primary-container/30 to-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-4 animate-fade-up">
      <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[24px] text-on-primary-container">notifications_active</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body-md text-body-md font-medium text-on-surface">Stay on top of your streaks</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Get reminders when your streak is at risk</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="bg-primary text-on-primary px-4 py-2 rounded-full font-label-sm text-label-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? '...' : 'Enable'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-on-surface-variant hover:text-on-surface px-2 py-2 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  )
}
