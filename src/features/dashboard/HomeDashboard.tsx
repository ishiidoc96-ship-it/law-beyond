import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  getUserStreakStats,
  getHabits,
  getHabitCompletions,
  getTodayTasks,
} from '../../lib/api'

export default function HomeDashboard() {
  const { user } = useAuth()
  const [streak, setStreak] = useState(0)
  const [habitsToday, setHabitsToday] = useState(0)
  const [tasksToday, setTasksToday] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user?.uid) return
      setLoading(true)
      const [streakRes, habitsRes, completionsRes, tasksRes] = await Promise.all([
        getUserStreakStats(user.uid),
        getHabits(user.uid),
        getHabitCompletions(user.uid),
        getTodayTasks(user.uid),
      ])
      setStreak(streakRes.data?.current_streak || 0)
      setHabitsToday(
        habitsRes.data && completionsRes.data
          ? Math.min(completionsRes.data.length, habitsRes.data.length)
          : 0
      )
      setTasksToday(tasksRes.data?.length || 0)
      setLoading(false)
    }
    load()
  }, [user?.uid])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const stats = [
    {
      label: 'Streak',
      value: streak,
      icon: 'local_fire_department',
      color: 'gradient-warm',
      to: '/streaks',
    },
    {
      label: 'Habits',
      value: habitsToday,
      icon: 'check_circle',
      color: 'gradient-accent',
      to: '/habits',
    },
    {
      label: 'Tasks',
      value: tasksToday,
      icon: 'task_alt',
      color: 'gradient-cool',
      to: '/planner',
    },
  ]

  const quickActions = [
    { label: 'Journal', icon: 'edit_note', to: '/journal', color: 'bg-tertiary-container text-on-tertiary-container' },
    { label: 'Budget', icon: 'savings', to: '/budget', color: 'bg-secondary-container text-on-secondary-container' },
    { label: 'Friends', icon: 'group', to: '/streaks?tab=friends', color: 'bg-primary-container text-on-primary-container' },
  ]

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Greeting */}
      <div className="animate-fade-up">
        <p className="text-on-surface-variant text-sm font-medium">{greeting}</p>
        <h2 className="text-on-surface text-2xl font-bold mt-0.5">
          {user?.displayName || 'Lawyer'}
        </h2>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 skeleton rounded-2xl" />
            ))
          : stats.map((stat) => (
              <Link
                key={stat.label}
                to={stat.to}
                className="card-hover block rounded-2xl p-4 bg-surface-container-high border border-outline-variant/10"
              >
                <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                  <span className="material-symbols-outlined text-white text-lg">
                    {stat.icon}
                  </span>
                </div>
                <p className="text-2xl font-bold text-on-surface">{stat.value}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{stat.label}</p>
              </Link>
            ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-on-surface font-semibold text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="card-hover flex flex-col items-center gap-2 rounded-2xl p-4 bg-surface-container-high border border-outline-variant/10"
            >
              <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center`}>
                <span className="material-symbols-outlined text-xl">{action.icon}</span>
              </div>
              <span className="text-xs font-medium text-on-surface">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Daily tip */}
      <div className="rounded-2xl p-5 gradient-accent text-white animate-fade-up">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-2xl mt-0.5">tips_and_updates</span>
          <div>
            <h3 className="font-semibold text-sm">Daily Tip</h3>
            <p className="text-white/85 text-sm mt-1 leading-relaxed">
              Consistency is key. Even 15 minutes of focused study daily compounds into
              extraordinary results over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
