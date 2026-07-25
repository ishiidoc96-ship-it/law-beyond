import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getTasks, getHabits, getHabitCompletions, getTransactions, toggleHabitCompletion, updateTask, getUserStreakStats } from '../../lib/api'
import type { DbTask, DbHabit, DbHabitCompletion, DbTransaction, DbUserStreak } from '../../lib/api'
import { getMilestoneForStreak, isStreakExpiring } from '../../lib/streak-milestones'

export default function HomeDashboard() {
  const { profile, user } = useAuth()
  const [tasks, setTasks] = useState<DbTask[]>([])
  const [habits, setHabits] = useState<DbHabit[]>([])
  const [completions, setCompletions] = useState<DbHabitCompletion[]>([])
  const [transactions, setTransactions] = useState<DbTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [streakData, setStreakData] = useState<DbUserStreak | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getTasks(user.id),
      getHabits(user.id),
      getHabitCompletions(user.id),
      getTransactions(user.id),
      getUserStreakStats(user.id),
    ]).then(([t, h, c, tx, s]) => {
      if (t.data) setTasks(t.data)
      if (h.data) setHabits(h.data)
      if (c.data) setCompletions(c.data)
      if (tx.data) setTransactions(tx.data)
      if (s.data) setStreakData(s.data)
    }).finally(() => setLoading(false))
  }, [user])

  const completedTasks = tasks.filter(t => t.completed).length
  const completedHabits = completions.length
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const budgetLeft = totalIncome - totalExpenses
  const upcomingDeadlines = tasks.filter(t => t.due_date && new Date(t.due_date) > new Date() && !t.completed)
  const nearestDeadline = upcomingDeadlines[0]

  const priorityColors: Record<string, string> = {
    high: 'bg-error-container text-on-error-container',
    medium: 'bg-secondary-container/30 text-secondary',
    low: 'bg-surface-container-high text-on-surface-variant',
  }

  const habitToggle = useCallback(async (habitId: string, done: boolean) => {
    if (!user) return
    try {
      const { error } = await toggleHabitCompletion(user.id, habitId, !done)
      if (error) throw error
      if (!done) {
        setCompletions(prev => [...prev, { id: 'temp', habit_id: habitId, user_id: user.id, completed_date: new Date().toISOString().split('T')[0], created_at: '' }])
      } else {
        setCompletions(prev => prev.filter(c => c.habit_id !== habitId))
      }
    } catch (err) {
      console.error('Habit toggle failed:', err)
    }
  }, [user])

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 18 ? 'Good Afternoon' : 'Good Evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const formatDueDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Due Today'
    if (diff === 1) return 'Due Tomorrow'
    if (diff < 7) return `Due in ${diff}d`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const toggleTask = useCallback(async (task: DbTask) => {
    if (!user) return
    try {
      const { error } = await updateTask(task.id, { completed: !task.completed })
      if (error) throw error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))
    } catch (err) {
      console.error('Task toggle failed:', err)
    }
  }, [user])

  if (loading) {
    return (
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined text-primary animate-spin text-[40px]">progress_activity</span>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8 animate-fade-up">
      <section className="mb-8">
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">{dateStr}</p>
        <h1 className="font-headline-lg text-[28px] md:text-[36px] leading-tight tracking-[-0.02em] font-bold text-on-surface">
          {greeting}, {displayName}
        </h1>
      </section>

      {/* Streak Widget */}
      {streakData && (
        <Link to="/streaks" className="block mb-8 group">
          <div className={`rounded-2xl p-5 flex items-center gap-4 transition-all btn-press ${
            streakData.current_streak > 0
              ? isStreakExpiring(streakData.last_post_date)
                ? 'bg-warning/10 border border-warning/30'
                : 'bg-gradient-to-r from-primary to-primary-container shadow-brand-sm'
              : 'bg-surface border border-outline-variant/50'
          }`}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
              streakData.current_streak > 0
                ? isStreakExpiring(streakData.last_post_date)
                  ? 'bg-warning/20'
                  : 'bg-white/20'
                : 'bg-surface-container-high'
            }`}>
              {streakData.current_streak > 0 && isStreakExpiring(streakData.last_post_date) ? (
                <span className="material-symbols-outlined text-[28px] text-warning animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_bottom</span>
              ) : (
                <span className={`material-symbols-outlined text-[28px] ${streakData.current_streak > 0 ? 'text-on-primary' : 'text-on-surface-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-headline-md text-headline-md ${streakData.current_streak > 0 ? (isStreakExpiring(streakData.last_post_date) ? 'text-warning' : 'text-on-primary') : 'text-on-surface'}`}>
                  {streakData.current_streak > 0 ? `${streakData.current_streak}-day streak` : 'Start your streak'}
                </span>
                {streakData.current_streak > 0 && (() => {
                  const m = getMilestoneForStreak(streakData.current_streak)
                  return m ? <span className="font-label-xs text-label-xs">{m.emoji}</span> : null
                })()}
              </div>
              <p className={`font-body-sm text-body-sm ${streakData.current_streak > 0 ? (isStreakExpiring(streakData.last_post_date) ? 'text-warning/80' : 'text-on-primary/80') : 'text-on-surface-variant'}`}>
                {streakData.current_streak > 0
                  ? isStreakExpiring(streakData.last_post_date)
                    ? 'Post now to keep your streak alive!'
                    : 'Post today to keep it going'
                  : 'Post your first daily highlight'}
              </p>
            </div>
            <span className={`material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform ${streakData.current_streak > 0 ? (isStreakExpiring(streakData.last_post_date) ? 'text-warning' : 'text-on-primary/80') : 'text-on-surface-variant'}`}>arrow_forward</span>
          </div>
        </Link>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { to: '/planner', icon: 'task_alt', value: `${completedTasks}/${tasks.length}`, label: 'Tasks Done', gradient: 'from-primary/15 to-primary/5', iconClass: 'text-primary bg-primary/15' },
          { to: '/habits', icon: 'local_fire_department', value: `${completedHabits}/${habits.length}`, label: 'Habits', gradient: 'from-secondary/15 to-secondary/5', iconClass: 'text-secondary-container bg-secondary-container/15' },
          { to: '/budget', icon: 'account_balance_wallet', value: `$${budgetLeft.toFixed(0)}`, label: 'Budget Left', gradient: 'from-tertiary/15 to-tertiary/5', iconClass: 'text-tertiary bg-tertiary/15' },
          { to: '/planner', icon: 'schedule', value: `${upcomingDeadlines.length}`, label: 'Deadlines', gradient: 'from-error/15 to-error/5', iconClass: 'text-error bg-error-container/15' },
        ].map((stat, i) => (
          <Link key={i} to={stat.to} className={`bg-gradient-to-br ${stat.gradient} border border-outline-variant/30 rounded-2xl p-4 md:p-5 flex items-center gap-3 hover:shadow-ambient hover:border-outline-variant/60 transition-all duration-200 btn-press cursor-pointer`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.iconClass}`}>
              <span className="material-symbols-outlined text-[20px]">{stat.icon}</span>
            </div>
            <div className="min-w-0">
              <div className="font-headline-md text-headline-md text-on-surface leading-tight">{stat.value}</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">{stat.label}</div>
            </div>
          </Link>
        ))}
      </section>

      {nearestDeadline && (
        <div className="bg-gradient-to-r from-primary to-primary-container rounded-2xl p-5 md:p-6 mb-8 shadow-brand-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[18px] text-on-primary">warning</span>
            <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-primary/80">Upcoming Deadline</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-primary mb-1">{nearestDeadline.title}</h3>
          <p className="font-body-md text-body-md text-on-primary/80">{formatDueDate(nearestDeadline.due_date!)}{nearestDeadline.description ? ` — ${nearestDeadline.description}` : ''}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <section className="md:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface">Tasks</h2>
            <Link to="/planner" className="text-primary font-label-sm text-label-sm hover:underline font-semibold">View All</Link>
          </div>
          <div className="bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden shadow-ambient-sm">
            {tasks.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[28px] text-primary">task_alt</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">No tasks yet. Create one in the Planner.</p>
              </div>
            ) : (
              tasks.slice(0, 5).map((task, i) => (
                <div key={task.id} className={`p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group ${i > 0 ? 'border-t border-outline-variant/30' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      aria-label={`Toggle task: ${task.title}`}
                      onClick={(e) => { e.stopPropagation(); toggleTask(task) }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${task.completed ? 'bg-primary border-primary' : 'border-outline-variant group-hover:border-primary'}`}
                    >
                      {task.completed && <span className="material-symbols-outlined text-[12px] text-on-primary">check</span>}
                    </button>
                    <div className="min-w-0">
                      <div className={`font-body-md text-body-md font-medium truncate ${task.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{task.title}</div>
                      <div className="font-label-sm text-label-sm text-on-surface-variant truncate">{task.due_date ? formatDueDate(task.due_date) : 'No due date'}</div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-xl text-[11px] font-label-sm font-semibold whitespace-nowrap flex-shrink-0 ml-3 ${priorityColors[task.priority] || priorityColors.medium}`}>{task.priority}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="md:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface">Habits</h2>
            <Link to="/habits" className="text-primary font-label-sm text-label-sm hover:underline font-semibold">View All</Link>
          </div>
          <div className="bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden shadow-ambient-sm">
            {habits.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[28px] text-secondary">self_improvement</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">No habits yet. Start building discipline!</p>
              </div>
            ) : (
              habits.map((habit, i) => {
                const done = completions.some(c => c.habit_id === habit.id)
                return (
                  <div key={habit.id} className={`p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group ${i > 0 ? 'border-t border-outline-variant/30' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-tertiary'}`}>
                        <span className="material-symbols-outlined text-[18px]">{habit.icon}</span>
                      </div>
                      <span className="font-body-md text-body-md text-on-surface font-medium truncate">{habit.name}</span>
                    </div>
                    <button
                      aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${habit.name}`}
                      onClick={() => habitToggle(habit.id, done)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0 ml-3 ${done ? 'bg-primary text-on-primary' : 'border-2 border-outline-variant text-outline-variant hover:border-primary hover:text-primary'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{done ? 'check' : 'add'}</span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      <section className="mt-8 mb-4">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/planner', icon: 'calendar_month', label: 'Planner', color: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary' },
            { to: '/budget', icon: 'account_balance_wallet', label: 'Budget', color: 'bg-secondary/10 text-secondary group-hover:bg-secondary-container group-hover:text-on-secondary-container' },
            { to: '/journal', icon: 'edit_note', label: 'Journal', color: 'bg-tertiary/10 text-tertiary group-hover:bg-tertiary-container group-hover:text-on-tertiary-container' },
            { to: '/habits', icon: 'trending_up', label: 'Habits', color: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary' },
          ].map((action) => (
            <Link key={action.to} to={action.to} aria-label={action.label} className="bg-surface border border-outline-variant/30 rounded-2xl p-5 flex flex-col items-center gap-3 hover:shadow-ambient hover:border-outline-variant/60 transition-all duration-200 group btn-press">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${action.color}`}>
                <span className="material-symbols-outlined text-[22px]">{action.icon}</span>
              </div>
              <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-on-surface transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
