import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getTransactions, createTransaction, deleteTransaction } from '../../lib/api'
import type { DbTransaction } from '../../lib/api'
import Modal from '../../components/ui/Modal'

const CATEGORY_ICONS: Record<string, string> = {
  retainer: 'description',
  court_fees: 'account_balance',
  food: 'local_cafe',
  general: 'payments',
}

const CATEGORY_BGS: Record<string, string> = {
  retainer: 'bg-primary/10 text-primary',
  court_fees: 'bg-tertiary/10 text-tertiary',
  food: 'bg-secondary/10 text-secondary',
  general: 'bg-surface-container-high text-on-surface-variant',
}

function getIcon(category: string | null) {
  const cat = category?.toLowerCase().replace(/\s+/g, '_') || 'general'
  return CATEGORY_ICONS[cat] || 'payments'
}

function getIconBg(category: string | null) {
  const cat = category?.toLowerCase().replace(/\s+/g, '_') || 'general'
  return CATEGORY_BGS[cat] || CATEGORY_BGS.general
}

function formatCurrency(amount: number) {
  return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
    days.push({
      label: dayNames[i],
      date: d.toISOString().split('T')[0],
      isToday: d.toISOString().split('T')[0] === now.toISOString().split('T')[0],
    })
  }
  return days
}

export default function BudgetTracker() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<DbTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formCategory, setFormCategory] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getTransactions(user.id).then(({ data }) => {
      setTransactions(data || [])
      setLoading(false)
    })
  }, [user])

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpenses

  const weekDays = getWeekDays()
  const weeklySpending = weekDays.map(day => {
    const dayTotal = transactions
      .filter(t => t.type === 'expense' && t.transaction_date === day.date)
      .reduce((sum, t) => sum + t.amount, 0)
    return { ...day, total: dayTotal }
  })
  const maxWeekly = Math.max(...weeklySpending.map(d => d.total), 1)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!user) return
    if (!formTitle.trim()) {
      setFormError('Title is required')
      return
    }
    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormError('Enter a valid amount')
      return
    }
    setSubmitting(true)
    const { data, error } = await createTransaction(user.id, {
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      amount,
      type: formType,
      category: formCategory.trim() || undefined,
      transaction_date: formDate,
    })
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
      return
    }
    if (data) {
      setTransactions(prev => [data, ...prev])
    }
    resetForm()
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    if (!user) return
    setDeleting(id)
    const { error } = await deleteTransaction(id, user.id)
    if (!error) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
    setDeleting(null)
  }

  function resetForm() {
    setFormTitle('')
    setFormDescription('')
    setFormAmount('')
    setFormType('expense')
    setFormCategory('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormError('')
  }

  if (!user) {
    return (
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-8 pb-24 md:pb-8">
        <div className="grid grid-cols-4 md:grid-cols-12 gap-4">
          <div className="col-span-4 md:col-span-12 flex items-center justify-center min-h-[400px]">
            <p className="font-body-lg text-on-surface-variant">Please log in to view your budget.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-8 pb-24 md:pb-8">
      <div className="grid grid-cols-4 md:grid-cols-12 gap-4">
        <section className="col-span-4 md:col-span-12 bg-primary-container text-on-primary-container rounded-[24px] p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
          <h2 className="font-label-md text-label-md opacity-90 mb-1 z-10 uppercase tracking-wider">Available Balance</h2>
          <div className="font-display-lg text-display-lg mb-3 z-10">{formatCurrency(balance)}</div>
          <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full z-10 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[16px]">{totalIncome > totalExpenses ? 'trending_up' : 'trending_down'}</span>
            <span className="font-label-sm text-label-sm">
              {totalIncome > totalExpenses ? '+' : ''}{totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}% of income
            </span>
          </div>
          <button
            aria-label="Add new transaction"
            onClick={() => { resetForm(); setModalOpen(true) }}
            className="mt-4 z-10 bg-on-primary-container text-primary-container px-6 py-2.5 rounded-full font-label-md text-label-md font-bold hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px] align-middle mr-1">add</span>
            Add Transaction
          </button>
        </section>

        <section className="col-span-2 md:col-span-6 bg-surface border border-outline-variant rounded-[24px] p-6 flex flex-col justify-between hover:bg-surface-container-low transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-on-surface-variant">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
            </div>
            <h3 className="font-label-md text-label-md font-medium">Total Income</h3>
          </div>
          <div className="font-headline-md text-headline-md text-on-surface tracking-tight">{formatCurrency(totalIncome)}</div>
        </section>

        <section className="col-span-2 md:col-span-6 bg-surface border border-outline-variant rounded-[24px] p-6 flex flex-col justify-between hover:bg-surface-container-low transition-all duration-200 hover:shadow-sm">
          <div className="flex items-center gap-3 mb-3 text-on-surface-variant">
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
            </div>
            <h3 className="font-label-md text-label-md font-medium">Total Expenses</h3>
          </div>
          <div className="font-headline-md text-headline-md text-on-surface tracking-tight">{formatCurrency(totalExpenses)}</div>
        </section>

        <section className="col-span-4 md:col-span-7 bg-surface border border-outline-variant p-4 flex flex-col gap-4 rounded-[24px]">
          <div className="flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Spending Overview</h3>
            <span className="text-primary font-label-sm text-label-sm">Weekly</span>
          </div>
          <div className="flex items-end justify-between h-48 gap-1 md:gap-2 mt-auto pt-2 border-b border-surface-variant pb-1">
            {weeklySpending.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                <div className="w-full bg-surface-variant rounded-t-sm h-full flex items-end overflow-hidden">
                  <div
                    className={`w-full transition-colors ${day.isToday ? 'bg-primary' : 'bg-tertiary-container group-hover:bg-primary'}`}
                    style={{ height: `${maxWeekly > 0 ? (day.total / maxWeekly) * 100 : 0}%` }}
                  />
                </div>
                <span className={`font-label-sm text-label-sm ${day.isToday ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-4 md:col-span-5 bg-surface border border-outline-variant p-4 flex flex-col rounded-[24px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Recent Activity</h3>
            <button
              onClick={() => { resetForm(); setModalOpen(true) }}
              className="p-2 rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-[24px]">add_circle</span>
            </button>
          </div>
          {loading ? (
            <div className="flex-grow flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant animate-spin">progress_activity</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-3 py-8">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">account_balance_wallet</span>
              <p className="font-body-md text-on-surface-variant">No transactions yet</p>
              <button
                onClick={() => { resetForm(); setModalOpen(true) }}
                className="text-primary font-label-md text-label-md font-bold hover:underline"
              >
                Add your first transaction
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-1 flex-grow overflow-y-auto hide-scrollbar">
              {transactions.map(tx => (
                <li key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-surface-container-low transition-all duration-200 group border border-transparent hover:border-outline-variant">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${getIconBg(tx.category)}`}>
                      <span className="material-symbols-outlined text-[24px]">{getIcon(tx.category)}</span>
                    </div>
                    <div>
                      <h4 className="font-body-md font-medium text-on-surface">{tx.title}</h4>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {tx.category || tx.description || 'No details'} · {formatDate(tx.transaction_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`font-body-md font-bold ${tx.type === 'income' ? 'text-primary' : 'text-on-surface'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                    </div>
                    <button
                      aria-label={`Delete transaction: ${tx.title}`}
                      onClick={() => handleDelete(tx.id)}
                      disabled={deleting === tx.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-error-container hover:text-error transition-all active:scale-90 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {deleting === tx.id ? 'progress_activity' : 'close'}
                      </span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div className="bg-error-container text-on-error-container px-4 py-2 rounded-xl font-label-sm text-label-sm">
              {formError}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="e.g. Client retainer payment"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface-variant">Description</label>
            <input
              type="text"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="Optional details"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Type *</label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as 'income' | 'expense')}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Category</label>
              <input
                type="text"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="e.g. retainer, food"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md font-bold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Adding...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add Transaction
              </>
            )}
          </button>
        </form>
      </Modal>
    </main>
  )
}
