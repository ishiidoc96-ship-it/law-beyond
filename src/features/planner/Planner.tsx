import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getAssignments,
  createAssignment,
  deleteAssignment,
  type DbTask,
  type DbAssignment,
} from '../../lib/api'

function getWeekDays() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
  const days = []
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    const isWeekend = i >= 5
    days.push({
      day: dayNames[i],
      date: d.getDate(),
      full: d.toISOString().split('T')[0],
      active: isToday,
      dimmed: isWeekend && !isToday,
    })
  }
  return days
}

function formatMonth() {
  const now = new Date()
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatDueDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff <= 7) return `${diff} days left`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function priorityBadge(priority: string | null) {
  switch (priority) {
    case 'high':
      return 'bg-error/10 text-error border-error/20'
    case 'medium':
      return 'bg-secondary/10 text-secondary border-secondary/20'
    case 'low':
      return 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
    default:
      return 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
  }
}

function priorityLabel(priority: string | null) {
  switch (priority) {
    case 'high': return 'High'
    case 'medium': return 'Medium'
    case 'low': return 'Low'
    default: return 'None'
  }
}

export default function Planner() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<DbTask[]>([])
  const [assignments, setAssignments] = useState<DbAssignment[]>([])
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'task' | 'assignment'>('task')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newSubject, setNewSubject] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const weekDays = getWeekDays()

  const fetchData = useCallback(async () => {
    if (!user) return
    const [tasksRes, assignmentsRes] = await Promise.all([
      getTasks(user.id),
      getAssignments(user.id),
    ])
    if (tasksRes.data) setTasks(tasksRes.data)
    if (assignmentsRes.data) setAssignments(assignmentsRes.data)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDay(today)
  }, [])

  const openModal = (type: 'task' | 'assignment') => {
    setModalType(type)
    setNewTitle('')
    setNewDescription('')
    setNewDueDate(selectedDay)
    setNewPriority('medium')
    setNewSubject('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return
    if (modalType === 'task') {
      const { error: createError } = await createTask(user.id, {
        title: newTitle.trim(),
        description: newDescription.trim(),
        due_date: newDueDate || selectedDay,
        priority: newPriority,
      })
      if (createError) {
        setError('Failed to create task')
        return
      }
    } else {
      const { error: createError } = await createAssignment(user.id, {
        title: newTitle.trim(),
        description: newSubject.trim() || 'General',
        due_date: newDueDate || selectedDay,
      })
      if (createError) {
        setError('Failed to create assignment')
        return
      }
    }
    setShowModal(false)
    await fetchData()
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!user) return
    const { error: updateError } = await updateTask(taskId, { completed: !completed })
    if (updateError) {
      setError('Failed to update task')
      return
    }
    await fetchData()
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return
    const { error: deleteError } = await deleteTask(taskId, user.id)
    if (deleteError) {
      setError('Failed to delete task')
      return
    }
    await fetchData()
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user) return
    const { error: deleteError } = await deleteAssignment(assignmentId)
    if (deleteError) {
      setError('Failed to delete assignment')
      return
    }
    await fetchData()
  }

  const filteredTasks = tasks.filter(t => t.due_date === selectedDay)
  const filteredAssignments = assignments.filter(a => a.due_date === selectedDay)
  const completedCount = filteredTasks.filter(t => t.completed).length
  const totalCount = filteredTasks.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <main className="pt-[80px] pb-[100px] px-4 md:px-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6">
        <h2 className="font-headline-lg text-[28px] md:text-[32px] leading-tight tracking-[-0.02em] font-bold text-on-surface">Planner</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Organize your tasks and assignments.</p>
      </div>

      {error && (
        <div className="bg-error-container/30 text-on-error-container px-4 py-2.5 rounded-xl font-label-sm text-label-sm mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Month Header */}
      <section className="mb-4 flex items-center justify-between">
        <h3 className="font-headline-md text-headline-md text-on-surface">{formatMonth()}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('task')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-bold hover:opacity-90 transition-all active:scale-[0.98] shadow-brand-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span className="hidden sm:inline">Task</span>
          </button>
          <button
            onClick={() => openModal('assignment')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-bold hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[16px]">school</span>
            <span className="hidden sm:inline">Assignment</span>
          </button>
        </div>
      </section>

      {/* Week Strip */}
      <section className="mb-6 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 pb-2">
          {weekDays.map((d) => (
            <button
              key={d.full}
              onClick={() => setSelectedDay(d.full)}
              className={`flex flex-col items-center min-w-[52px] py-3 px-2 rounded-2xl transition-all active:scale-95 ${
                selectedDay === d.full
                  ? 'bg-primary text-on-primary shadow-brand-md'
                  : d.dimmed
                  ? 'bg-surface-container-low text-on-surface-variant/40'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="font-label-xs text-label-xs uppercase tracking-wider mb-1">{d.day}</span>
              <span className={`font-headline-sm text-headline-sm ${selectedDay === d.full ? 'font-bold' : ''}`}>{d.date}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {completedCount} of {totalCount} tasks completed
            </span>
            <span className="font-label-sm text-label-sm text-primary font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-surface-container-low rounded-2xl border border-outline-variant/30 skeleton" />
          ))}
        </div>
      ) : (
        <>
          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <section className="mb-6">
              <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Tasks
              </h4>
              <div className="flex flex-col gap-2">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all card-hover ${
                      task.completed
                        ? 'bg-surface-container-low border-outline-variant/20 opacity-60'
                        : 'bg-surface border-outline-variant/30'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTask(task.id, task.completed)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${
                        task.completed
                          ? 'bg-primary border-primary text-on-primary'
                          : 'border-outline-variant hover:border-primary'
                      }`}
                    >
                      {task.completed && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-body-lg text-body-lg ${task.completed ? 'line-through text-on-surface-variant' : 'text-on-surface font-medium'}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant/60 mt-0.5 truncate">{task.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${priorityBadge(task.priority)}`}>
                      {priorityLabel(task.priority)}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-error-container/30 hover:text-error transition-colors flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Assignments */}
          {filteredAssignments.length > 0 && (
            <section className="mb-6">
              <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">school</span>
                Assignments
              </h4>
              <div className="flex flex-col gap-2">
                {filteredAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-outline-variant/30 card-hover"
                  >
                    <div className="w-8 h-8 rounded-xl bg-secondary-container/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-secondary-container">school</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-lg text-body-lg text-on-surface font-medium">{assignment.title}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant/60 mt-0.5">
                        {assignment.description || 'Assignment'} · {formatDueDate(assignment.due_date || '')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-error-container/30 hover:text-error transition-colors flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {filteredTasks.length === 0 && filteredAssignments.length === 0 && (
            <div className="flex flex-col items-center py-16 bg-surface rounded-3xl border border-outline-variant/50 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-primary-container/30 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[32px] text-on-primary-container/60">event_note</span>
              </div>
              <p className="font-headline-sm text-headline-sm text-on-surface mb-1">Nothing scheduled</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center">Add a task or assignment to get started</p>
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => openModal('task')}
        className="md:hidden fixed bottom-[96px] right-4 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-brand-xl hover:scale-105 transition-all z-40 active:scale-95"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalType === 'task' ? 'New Task' : 'New Assignment'}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={modalType === 'task' ? 'Task title' : 'Assignment title'}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {modalType === 'task' ? (
            <>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none h-20 transition-all"
                />
              </div>
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={`flex-1 py-2.5 rounded-xl font-label-sm text-label-sm font-semibold transition-all active:scale-95 ${
                        newPriority === p
                          ? p === 'high' ? 'bg-error text-on-error'
                            : p === 'medium' ? 'bg-secondary text-on-secondary'
                            : 'bg-primary text-on-primary'
                          : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30'
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Subject</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Constitutional Law"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          )}

          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Due Date</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!newTitle.trim()}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold shadow-brand-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Create {modalType === 'task' ? 'Task' : 'Assignment'}
          </button>
        </div>
      </Modal>
    </main>
  )
}
