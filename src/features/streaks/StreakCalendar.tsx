import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getStreakCalendar } from '../../lib/api'

interface StreakCalendarProps {
  currentStreak: number
}

export default function StreakCalendar({ currentStreak }: StreakCalendarProps) {
  const { user } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [postedDates, setPostedDates] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getStreakCalendar(user.uid, year, month).then(({ data }) => {
      if (data?.posted_dates) {
        setPostedDates(data.posted_dates.map((d: string) => new Date(d).getDate()))
      } else {
        setPostedDates([])
      }
      setLoading(false)
    })
  }, [user, year, month])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const today = new Date()
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const postedCount = postedDates.length
  const daysSoFar = isCurrentMonth ? today.getDate() : daysInMonth
  const completionRate = daysSoFar > 0 ? Math.round((postedCount / daysSoFar) * 100) : 0

  return (
    <div className="bg-surface border border-outline-variant/30 rounded-[24px] p-5 mb-6 shadow-ambient-sm">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="w-10 h-10 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">chevron_left</span>
        </button>
        <div className="text-center">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            {monthNames[month - 1]}
          </h3>
          <span className="font-label-sm text-label-sm text-on-surface-variant">{year}</span>
        </div>
        <button
          onClick={nextMonth}
          className="w-10 h-10 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">chevron_right</span>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className={`text-center font-label-xs text-label-xs uppercase py-1 ${i === 0 || i === 6 ? 'text-on-surface-variant/40' : 'text-on-surface-variant'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-surface-container-high animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const posted = postedDates.includes(day)
            const isToday = isCurrentMonth && day === today.getDate()
            const isFuture = isCurrentMonth && day > today.getDate()
            const isWeekend = (i + firstDayOfWeek) % 7 === 0 || (i + firstDayOfWeek) % 7 === 6

            return (
              <div
                key={day}
                className={`aspect-square rounded-xl flex items-center justify-center font-label-sm text-label-sm transition-all duration-200 relative ${
                  posted
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-on-primary font-bold shadow-brand-sm'
                    : isToday
                    ? 'bg-primary/10 border-2 border-primary text-primary font-bold'
                    : isFuture
                    ? 'text-on-surface-variant/20'
                    : isWeekend
                    ? 'text-on-surface-variant/30'
                    : 'text-on-surface-variant/50 hover:bg-surface-container-high'
                }`}
              >
                {day}
                {posted && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-on-primary/60" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend + stats */}
      <div className="mt-5 pt-4 border-t border-outline-variant/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-md bg-gradient-to-br from-primary to-primary/80 shadow-brand-sm" />
              <span className="font-label-xs text-label-xs text-on-surface-variant">Posted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-md border-2 border-primary bg-primary/10" />
              <span className="font-label-xs text-label-xs text-on-surface-variant">Today</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="font-label-xs text-label-xs text-on-surface-variant">
              <span className="text-primary font-bold">{currentStreak}</span> day streak
            </span>
          </div>
        </div>

        {/* Completion bar */}
        {isCurrentMonth && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-label-xs text-label-xs text-on-surface-variant">
                {postedCount} of {daysSoFar} days posted
              </span>
              <span className="font-label-xs text-label-xs text-primary font-bold">{completionRate}%</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
