import { useState, useEffect, useCallback, useRef } from 'react'
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

function priorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-error-container text-on-error-container'
    case 'medium':
      return 'bg-secondary-container text-on-secondary-container'
    case 'low':
      return 'bg-surface-container-high text-on-surface-variant'
    default:
      return 'bg-surface-container-high text-on-surface-variant'
  }
}

function priorityLabel(priority: string) {
  switch (priority) {
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    default:
      return priority
  }
}

export default function Planner() {
  const { user } = useAuth()

  const [tasks, setTasks] = useState<DbTask[]>([])
  const [assignments, setAssignments] = useState<DbAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)

  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', priority: 'medium' })
  const [newAssignment, setNewAssignment] = useState({ title: '', subject: '', due_date: '' })

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const tasksSectionRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [tasksRes, assignmentsRes] = await Promise.all([
      getTasks(user.id),
      getAssignments(user.id),
    ])
    if (tasksRes.data) setTasks(tasksRes.data)
    if (assignmentsRes.data) setAssignments(assignmentsRes.data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const weekDays = getWeekDays()
  const todayStr = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter((t) => !t.completed)

  const upcomingTasks = tasks
    .filter((t) => t.due_date && t.due_date >= todayStr && !t.completed)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))

  const handleToggleTask = async (task: DbTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    )
    await updateTask(task.id, { completed: !task.completed })
  }

  const handleCreateTask = async () => {
    if (!user || !newTask.title.trim()) return
    const { data, error } = await createTask(user.id, {
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      due_date: newTask.due_date || undefined,
      priority: newTask.priority,
    })
    if (!error && data) {
      setTasks((prev) => [...prev, data].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')))
      setNewTask({ title: '', description: '', due_date: '', priority: 'medium' })
      setTaskModalOpen(false)
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!user) return
    setDeletingId(id)
    await deleteTask(id, user.id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setDeletingId(null)
  }

  const handleCreateAssignment = async () => {
    if (!user || !newAssignment.title.trim()) return
    const { data, error } = await createAssignment(user.id, {
      title: newAssignment.title.trim(),
      subject: newAssignment.subject.trim() || undefined,
      due_date: newAssignment.due_date || undefined,
    })
    if (!error && data) {
      setAssignments((prev) => [...prev, data].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')))
      setNewAssignment({ title: '', subject: '', due_date: '' })
      setAssignmentModalOpen(false)
    }
  }

  const handleDeleteAssignment = async (id: string) => {
    if (!user) return
    setDeletingId(id)
    await deleteAssignment(id, user.id)
    setAssignments((prev) => prev.filter((a) => a.id !== id))
    setDeletingId(null)
  }

  const remainingCount = tasks.filter((t) => !t.completed).length

  return (
    <main className="flex-grow pt-20 pb-28 px-4 md:px-8 w-full max-w-[1280px] mx-auto flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-end">
          <h2 className="font-headline-md text-headline-md">{formatMonth()}</h2>
          <button onClick={() => tasksSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="font-label-md text-label-md text-primary flex items-center gap-1 active:scale-95 transition-transform">
            Today <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          </button>
        </div>
        <div className="flex justify-between items-center bg-surface-container-low rounded-[20px] border border-outline-variant/30 p-2 overflow-x-auto gap-1.5 hide-scrollbar shadow-ambient-sm">
          {weekDays.map((d, i) => (
            <div
              key={i}
              className={`flex flex-col items-center min-w-[48px] py-3 px-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                d.active
                  ? 'bg-gradient-to-b from-primary to-primary/80 text-on-primary shadow-brand-md scale-105'
                  : d.dimmed
                  ? 'text-on-surface-variant/40 hover:bg-surface-container-high hover:text-on-surface-variant'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className={`text-[11px] font-label-xs uppercase tracking-wider ${d.active ? 'text-on-primary/80' : ''}`}>{d.day}</span>
              <span className={`font-headline-sm text-headline-sm mt-0.5 ${d.active ? 'font-bold' : 'font-medium'}`}>{d.date}</span>
              {d.active && (
                <div className="w-1.5 h-1.5 rounded-full bg-on-primary mt-1" />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <section ref={tasksSectionRef} className="md:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-outline-variant/30 pb-1">
            <h3 className="font-headline-md text-headline-md tracking-tight">Today's Tasks</h3>
            <span className="font-label-sm text-label-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold">
              {remainingCount} Remaining
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-surface-container-low rounded-[20px] border border-outline-variant/30 animate-pulse shadow-ambient-sm" />
              ))}
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <div className="w-16 h-16 rounded-2xl bg-primary-container/30 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[32px] text-on-primary-container/60">task_alt</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-1">No tasks yet</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant/60">Add a task to stay on track</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between p-4 bg-surface border border-outline-variant/30 rounded-[20px] hover:border-primary/30 transition-all duration-200 hover:shadow-ambient-sm ${task.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      aria-label={`Toggle task: ${task.title}`}
                      onClick={() => handleToggleTask(task)}
                      className="w-6 h-6 rounded border-2 border-outline-variant flex items-center justify-center hover:border-primary transition-colors flex-shrink-0"
                    >
                      {task.completed && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                      )}
                    </button>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-body-md text-body-md font-medium text-on-surface ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{task.description}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-label-sm font-label-sm px-3 py-1 rounded-full whitespace-nowrap ${priorityBadge(task.priority)}`}>
                      {priorityLabel(task.priority)}
                    </span>
                    <button
                      aria-label={`Delete task: ${task.title}`}
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deletingId === task.id}
                      className="w-8 h-8 rounded-full hover:bg-error-container/30 flex items-center justify-center transition-colors text-on-surface-variant/60 hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              <button
                aria-label="Add new task"
                onClick={() => setTaskModalOpen(true)}
                className="w-full py-3 border-2 border-dashed border-primary/30 rounded-[24px] text-on-surface-variant font-label-md hover:bg-surface-container-low hover:text-primary hover:border-primary transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[20px]">add</span> Add New Task
              </button>
            </div>
          )}
        </section>

        <section className="md:col-span-5 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-1">
              <h3 className="font-headline-md text-headline-md flex items-center gap-1 tracking-tight">
                <span className="material-symbols-outlined text-error">warning</span> Upcoming Deadlines
              </h3>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-[40px] mb-2">event_available</span>
                <p className="font-body-md text-body-md">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {upcomingTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="bg-error-container/20 border border-error-container p-4 rounded-[24px] flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-body-lg font-bold text-on-surface">{task.title}</h4>
                      <span className="font-label-md font-bold text-error">{formatDueDate(task.due_date!)}</span>
                    </div>
                    {task.description && (
                      <p className="font-body-md text-on-surface-variant line-clamp-2">{task.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-1">
              <h3 className="font-headline-md text-headline-md tracking-tight">Assignments</h3>
              <button
                aria-label="Add new assignment"
                onClick={() => setAssignmentModalOpen(true)}
                className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">add</span> Add
              </button>
            </div>
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                <div className="w-14 h-14 rounded-2xl bg-secondary-container/20 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[28px] text-on-secondary-container/60">menu_book</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-1">No assignments yet</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant/60">Add one to keep track</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="group bg-surface border border-outline-variant/30 p-4 rounded-[20px] flex items-center justify-between hover:shadow-ambient-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="bg-surface-container-high p-3 rounded-xl text-primary flex-shrink-0">
                        <span className="material-symbols-outlined">menu_book</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-body-lg font-medium text-on-surface truncate">{a.title}</h4>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {a.subject || 'No subject'}{a.due_date ? ` — ${formatDueDate(a.due_date)}` : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      aria-label={`Delete assignment: ${a.title}`}
                      onClick={() => handleDeleteAssignment(a.id)}
                      disabled={deletingId === a.id}
                      className="w-8 h-8 rounded-full hover:bg-error-container/30 flex items-center justify-center transition-colors text-on-surface-variant/60 hover:text-error flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Add New Task">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreateTask()
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Title *</label>
            <input
              type="text"
              required
              value={newTask.title}
              onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter task title"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Description</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors resize-none h-20"
              placeholder="Optional description"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Due Date</label>
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Priority</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="flex-1 py-3 rounded-xl border border-outline-variant font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity"
            >
              Add Task
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={assignmentModalOpen} onClose={() => setAssignmentModalOpen(false)} title="Add New Assignment">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreateAssignment()
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Title *</label>
            <input
              type="text"
              required
              value={newAssignment.title}
              onChange={(e) => setNewAssignment((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter assignment title"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Subject</label>
            <input
              type="text"
              value={newAssignment.subject}
              onChange={(e) => setNewAssignment((p) => ({ ...p, subject: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              placeholder="Optional subject"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Due Date</label>
            <input
              type="date"
              value={newAssignment.due_date}
              onChange={(e) => setNewAssignment((p) => ({ ...p, due_date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setAssignmentModalOpen(false)}
              className="flex-1 py-3 rounded-xl border border-outline-variant font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-opacity"
            >
              Add Assignment
            </button>
          </div>
        </form>
      </Modal>
    </main>
  )
}
