import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getHabits, createHabit, deleteHabit, getHabitCompletions, toggleHabitCompletion } from '../../lib/api'
import type { DbHabit } from '../../lib/api'
import Modal from '../../components/ui/Modal'

const ICON_OPTIONS = [
  { value: 'menu_book', label: 'Book' },
  { value: 'directions_run', label: 'Running' },
  { value: 'water_drop', label: 'Water' },
  { value: 'self_improvement', label: 'Meditation' },
  { value: 'edit_document', label: 'Writing' },
  { value: 'code', label: 'Code' },
  { value: 'fitness_center', label: 'Gym' },
  { value: 'restaurant', label: 'Nutrition' },
  { value: 'school', label: 'School' },
  { value: 'Brush', label: 'Art' },
]

const CATEGORY_OPTIONS = [
  'Self Improvement',
  'Health & Fitness',
  'Spiritual',
  'Professional',
  'Other',
]

export default function HabitTracker() {
  const { user } = useAuth()
  const [habits, setHabits] = useState<DbHabit[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState(CATEGORY_OPTIONS[0])
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[0].value)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    const [habitsRes, completionsRes] = await Promise.all([
      getHabits(user.id),
      getHabitCompletions(user.id),
    ])
    if (habitsRes.data) setHabits(habitsRes.data)
    if (completionsRes.data) {
      setCompletedIds(new Set(completionsRes.data.map(c => c.habit_id)))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const completedCount = completedIds.size
  const totalCount = habits.length
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const circumference = 2 * Math.PI * 40
  const dashOffset = circumference - (percentage / 100) * circumference

  const handleToggle = async (habitId: string) => {
    if (!user) return
    const isCompleted = completedIds.has(habitId)
    const { error: toggleError } = await toggleHabitCompletion(user.id, habitId, !isCompleted)
    if (toggleError) {
      setError('Failed to update habit')
      return
    }
    if (isCompleted) {
      setCompletedIds(prev => {
        const next = new Set(prev)
        next.delete(habitId)
        return next
      })
    } else {
      setCompletedIds(prev => new Set(prev).add(habitId))
    }
  }

  const handleAdd = async () => {
    if (!user || !newName.trim()) return
    const { error: addError } = await createHabit(user.id, {
      name: newName.trim(),
      category: newCategory,
      icon: newIcon,
    })
    if (addError) {
      setError('Failed to add habit')
      return
    }
    setNewName('')
    setNewCategory(CATEGORY_OPTIONS[0])
    setNewIcon(ICON_OPTIONS[0].value)
    setShowModal(false)
    await fetchData()
  }

  const handleDelete = async (habitId: string) => {
    if (!user) return
    const { error: deleteError } = await deleteHabit(habitId, user.id)
    if (deleteError) {
      setError('Failed to delete habit')
      return
    }
    await fetchData()
  }

  if (!user) return null

  return (
    <main className="pt-[80px] pb-[100px] px-4 md:px-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6">
        <h2 className="font-headline-lg text-[28px] md:text-[32px] leading-tight text-on-surface">Habit Planner</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Stay consistent with your daily routines.</p>
      </div>

      {error && (
        <div className="bg-error-container/30 text-on-error-container px-4 py-2.5 rounded-xl font-label-sm text-label-sm mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      <section className="mb-8 bg-surface border border-outline-variant/50 rounded-3xl p-5 shadow-ambient-sm flex flex-col md:flex-row gap-6 items-center">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle className="text-surface-container-high" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
            <circle className="text-primary" cx="50" cy="50" fill="transparent" r="40" stroke="currentColor" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" strokeWidth="8" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-headline-md text-headline-md font-bold text-on-surface">{percentage}%</span>
          </div>
        </div>
        <div className="flex-1 w-full grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col items-start justify-center">
            <div className="flex items-center gap-1 text-on-surface-variant mb-1">
              <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Current Streak</span>
            </div>
            <div className="font-headline-md text-headline-md text-primary flex items-baseline gap-1">
              12 <span className="font-label-sm text-label-sm text-on-surface-variant">days</span>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col items-start justify-center">
            <div className="flex items-center gap-1 text-on-surface-variant mb-1">
              <span className="material-symbols-outlined text-[14px]">emoji_events</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Longest</span>
            </div>
            <div className="font-headline-md text-headline-md text-on-surface flex items-baseline gap-1">
              45 <span className="font-label-sm text-label-sm text-on-surface-variant">days</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-headline-md text-headline-md text-on-surface">Today</h3>
          <button onClick={() => setShowModal(true)} className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-bold hover:shadow-brand-lg transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Habit
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant animate-spin">progress_activity</span>
          </div>
        )}

        {!loading && habits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-3xl border border-outline-variant/50 border-dashed">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3">psychology</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant text-center">No habits yet. Start building discipline!</p>
          </div>
        )}

        {!loading && habits.map((habit) => {
          const isDone = completedIds.has(habit.id)
          const progressPercent = isDone ? 100 : 0
          return (
            <div key={habit.id} className="group bg-surface rounded-2xl p-4 border border-outline-variant/50 hover:shadow-ambient transition-all flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-tertiary'}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{habit.icon}</span>
                  </div>
                  <div>
                    <div className="font-body-lg text-body-lg font-semibold text-on-surface">{habit.name}</div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">{habit.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label={`Delete habit: ${habit.name}`}
                    onClick={() => handleDelete(habit.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/60 hover:bg-error-container/30 hover:text-error transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                  <button
                    aria-label={`${isDone ? 'Mark incomplete' : 'Mark complete'}: ${habit.name}`}
                    onClick={() => handleToggle(habit.id)}
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-primary border-primary text-on-primary'
                        : 'border-outline-variant text-outline-variant hover:border-primary hover:text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  </button>
                </div>
              </div>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )
        })}
      </section>

      <button
        aria-label="Add new habit"
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-[96px] right-4 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-brand-xl hover:shadow-brand-xl transition-all z-40 active:scale-95"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Habit">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Read 20 Pages"
              className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:bg-surface transition-all"
            />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Category</label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-xl font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-surface transition-all"
            >
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map(icon => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setNewIcon(icon.value)}
                  className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                    newIcon === icon.value
                      ? 'bg-primary text-on-primary border-primary shadow-brand-sm'
                      : 'bg-surface-container-low border-transparent text-on-surface-variant hover:border-primary/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">{icon.value}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full py-3.5 bg-primary text-on-primary font-label-md text-label-md font-bold rounded-xl hover:shadow-brand-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mt-1"
          >
            Add Habit
          </button>
        </div>
      </Modal>
    </main>
  )
}
