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

function getWeekData(transactions: DbTransaction[]) {
  const days = getWeekDays()
  return days.map(d => {
    const dayTx = transactions.filter(t => t.date.startsWith(d.date))
    const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { ...d, income, expense }
  })
}

export default function BudgetTracker() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<DbTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!user?.id) return
      const { data } = await getTransactions(user.id)
      if (data) setTransactions(data)
      setLoading(false)
    }
    load()
  }, [user?.id])

  const balance = transactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0)
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const weekData = getWeekData(transactions)
  const maxDayAmount = Math.max(...weekData.map(d => d.income + d.expense), 1)

  const categories = [
    { id: 'retainer', label: 'Retainer', icon: 'description' },
    { id: 'court_fees', label: 'Court Fees', icon: 'account_balance' },
    { id: 'food', label: 'Food', icon: 'local_cafe' },
    { id: 'general', label: 'General', icon: 'payments' },
  ]

  const handleCreate = async () => {
    if (!user || !amount || Number(amount) <= 0) return
    const { error: createError } = await createTransaction(user.id, {
      title: description.trim() || `${type === 'income' ? 'Income' : 'Expense'}`,
      type,
      amount: Number(amount),
      category: type === 'income' ? 'general' : category,
      date: new Date().toISOString().split('T')[0],
    })
    if (createError) {
      setError('Failed to add transaction')
      return
    }
    setShowModal(false)
    setAmount('')
    setDescription('')
    setCategory('general')
    const { data } = await getTransactions(user.id)
    if (data) setTransactions(data)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    const { error: deleteError } = await deleteTransaction(id)
    if (!deleteError) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    }
  }

  return (
    <main className="pt-[80px] pb-[100px] px-4 md:px-8 max-w-[1280px] mx-auto animate-fade-up">
      <div className="mb-6">
        <h2 className="font-headline-lg text-[28px] md:text-[32px] leading-tight tracking-[-0.02em] font-bold text-on-surface">Budget</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Track your income and expenses.</p>
      </div>

      {/* Balance Card */}
      <section className="mb-6 bg-gradient-to-br from-primary to-primary-container rounded-3xl p-6 text-on-primary shadow-brand-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        <p className="font-label-sm text-label-sm text-on-primary/70 uppercase tracking-wider mb-1">Total Balance</p>
        <p className="font-display-lg text-display-lg font-bold">{formatCurrency(balance)}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <div className="flex items-center gap-1 text-on-primary/70 mb-0.5">
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              <span className="font-label-xs text-label-xs uppercase">Income</span>
            </div>
            <p className="font-headline-sm text-headline-sm text-on-primary font-semibold">{formatCurrency(totalIncome)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-on-primary/70 mb-0.5">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              <span className="font-label-xs text-label-xs uppercase">Expenses</span>
            </div>
            <p className="font-headline-sm text-headline-sm text-on-primary font-semibold">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
      </section>

      {/* Week Chart */}
      <section className="mb-6 bg-surface rounded-2xl border border-outline-variant/30 p-5 shadow-ambient-sm">
        <h4 className="font-label-md text-label-md text-on-surface-variant mb-4 uppercase tracking-wider">This Week</h4>
        <div className="flex items-end justify-between gap-2 h-32">
          {weekData.map((d) => {
            const total = d.income + d.expense
            const height = total > 0 ? (total / maxDayAmount) * 100 : 4
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                  <div
                    className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${d.isToday ? 'bg-primary' : 'bg-primary/30'}`}
                    style={{ height: `${height}%`, minHeight: d.isToday ? '8px' : '4px' }}
                  />
                </div>
                <span className={`font-label-xs text-label-xs ${d.isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="mb-6">
        <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider">Categories</h4>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const catTotal = transactions.filter(t => t.category === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            return (
              <div key={cat.id} className="bg-surface rounded-2xl border border-outline-variant/30 p-4 card-hover">
                <div className={`w-10 h-10 rounded-xl ${CATEGORY_BGS[cat.id] || CATEGORY_BGS.general} flex items-center justify-center mb-2`}>
                  <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{cat.label}</p>
                <p className="font-headline-sm text-headline-sm text-on-surface">{formatCurrency(catTotal)}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Transactions */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Recent Transactions</h4>
          <button
            onClick={() => { setType('expense'); setShowModal(true) }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-bold hover:opacity-90 transition-all active:scale-[0.98] shadow-brand-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-surface-container-low rounded-2xl border border-outline-variant/30 skeleton" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-12 bg-surface rounded-3xl border border-outline-variant/50 border-dashed">
            <div className="w-16 h-16 rounded-2xl bg-primary-container/30 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[32px] text-on-primary-container/60">savings</span>
            </div>
            <p className="font-headline-sm text-headline-sm text-on-surface mb-1">No transactions yet</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Add your first transaction to get started</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-outline-variant/30 card-hover">
                <div className={`w-10 h-10 rounded-xl ${getIconBg(t.category)} flex items-center justify-center flex-shrink-0`}>
                  <span className="material-symbols-outlined text-[20px]">{getIcon(t.category)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-on-surface font-medium truncate">{t.title}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{formatDate(t.date)}</p>
                </div>
                <p className={`font-headline-sm text-headline-sm font-semibold ${t.type === 'income' ? 'text-primary' : 'text-error'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </p>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-error-container/30 hover:text-error transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FAB */}
      <button
        onClick={() => { setType('expense'); setShowModal(true) }}
        className="md:hidden fixed bottom-[96px] right-4 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-brand-xl hover:scale-105 transition-all z-40 active:scale-95"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Transaction">
        <div className="flex flex-col gap-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 rounded-xl font-label-sm text-label-sm font-semibold transition-all active:scale-95 ${
                type === 'expense' ? 'bg-error text-on-error' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 rounded-xl font-label-sm text-label-sm font-semibold transition-all active:scale-95 ${
                type === 'income' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-headline-md"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Category (expense only) */}
          {type === 'expense' && (
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1.5 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 py-2.5 px-3 rounded-xl font-body-sm text-body-sm font-medium transition-all active:scale-95 ${
                      category === cat.id
                        ? 'bg-primary text-on-primary shadow-brand-sm'
                        : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-error-container/30 text-on-error-container px-4 py-2.5 rounded-xl font-label-sm text-label-sm text-center">{error}</div>
          )}

          <button
            onClick={handleCreate}
            disabled={!amount || Number(amount) <= 0}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold shadow-brand-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Add {type === 'income' ? 'Income' : 'Expense'}
          </button>
        </div>
      </Modal>
    </main>
  )
}
