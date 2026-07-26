import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useStreakFreeze } from '../../lib/api'
import { playSuccessSound } from '../../lib/notify-sounds'
import { toast } from 'sonner'

interface StreakFreezeButtonProps {
  freezeAvailable: number
  currentStreak: number
  onFreezeUsed: () => void
}

export default function StreakFreezeButton({ freezeAvailable, currentStreak, onFreezeUsed }: StreakFreezeButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (freezeAvailable <= 0 || currentStreak === 0) return null

  const handleFreeze = async () => {
    if (!user || loading) return
    setLoading(true)
    const { data } = await useStreakFreeze(user.uid)
    if (data?.success) {
      onFreezeUsed()
      toast.success('Streak frozen! Your streak is protected for 1 day.')
      playSuccessSound()
    } else {
      toast.error(data?.error || 'Failed to use freeze')
    }
    setShowConfirm(false)
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 bg-freeze/10 border border-freeze/30 text-freeze px-4 py-2.5 rounded-full font-label-md text-label-md font-semibold hover:bg-freeze/20 transition-colors active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          ac_unit
        </span>
        Freeze ({freezeAvailable})
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-surface rounded-[24px] p-6 max-w-sm w-full mx-4 shadow-[0_8px_40px_rgba(0,0,0,0.2)]">
            <div className="w-14 h-14 rounded-full bg-freeze-container flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[28px] text-freeze" style={{ fontVariationSettings: "'FILL' 1" }}>
                ac_unit
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface text-center mb-2">
              Use Streak Freeze?
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant text-center mb-6">
              This will protect your {currentStreak}-day streak for one missed day. You have {freezeAvailable} freeze{freezeAvailable > 1 ? 's' : ''} left.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-full border border-outline-variant font-label-md text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFreeze}
                disabled={loading}
                className="flex-1 py-3 rounded-full bg-freeze text-on-freeze font-label-md text-label-md font-semibold hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Freezing...' : 'Use Freeze'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
