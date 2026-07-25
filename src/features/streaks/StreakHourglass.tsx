import { useEffect, useState } from 'react'
import { isStreakExpiring, hoursUntilExpiry } from '../../lib/streak-milestones'

interface StreakHourglassProps {
  lastPostDate: string | null
  currentStreak: number
}

export default function StreakHourglass({ lastPostDate, currentStreak }: StreakHourglassProps) {
  const [hoursLeft, setHoursLeft] = useState(0)
  const expiring = isStreakExpiring(lastPostDate)

  useEffect(() => {
    setHoursLeft(hoursUntilExpiry(lastPostDate))
  }, [lastPostDate])

  if (!expiring || currentStreak === 0) return null

  const hours = Math.floor(hoursLeft)
  const mins = Math.floor((hoursLeft - hours) * 60)

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 mb-6 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[28px] text-warning" style={{ fontVariationSettings: "'FILL' 1" }}>
          hourglass_bottom
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-label-md text-label-md font-semibold text-warning">
          Streak expiring soon!
        </p>
        <p className="font-body-sm text-body-sm text-warning/80">
          Post before {hours}h {mins}m to keep your {currentStreak}-day streak alive
        </p>
      </div>
    </div>
  )
}
