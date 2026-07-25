import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getJournalEntries, createJournalEntry, deleteJournalEntry } from '../../lib/api'
import type { DbJournalEntry } from '../../lib/api'

const moods = ['😊', '😄', '😐', '😔', '😴']

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (date.toDateString() === now.toDateString()) return `Today, ${timeStr}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`

  if (diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    return `${dayName}, ${timeStr}`
  }

  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`
}

export default function Journal() {
  const { user } = useAuth()
  const [selectedMood, setSelectedMood] = useState(1)
  const [entry, setEntry] = useState('')
  const [entries, setEntries] = useState<DbJournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchEntries = async () => {
    if (!user) return
    const { data } = await getJournalEntries(user.id)
    if (data) setEntries(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchEntries()
  }, [user])

  const handleSave = async () => {
    if (!user || !entry.trim() || saving) return
    setSaving(true)
    setError('')
    const { error: saveError } = await createJournalEntry(user.id, {
      title: entry.trim().slice(0, 50),
      content: entry.trim(),
      mood: moods[selectedMood],
    })
    if (saveError) {
      setError('Failed to save entry. Please try again.')
    } else {
      setEntry('')
      setSelectedMood(1)
      await fetchEntries()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    const { error } = await deleteJournalEntry(id)
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  return (
    <main className="w-full max-w-2xl mx-auto px-5 py-6 flex flex-col gap-6 relative z-10 pb-32 animate-fade-up">
      <section className="flex flex-col gap-4 mt-4 md:mt-0">
        <h1 className="font-headline-lg text-[32px] leading-[40px] tracking-[-0.02em] font-bold text-on-surface">How are you today?</h1>
        <div className="flex justify-between items-center bg-surface-container-low border border-outline-variant/30 rounded-[24px] p-3 shadow-ambient-sm">
          {moods.map((mood, i) => (
            <button
              key={i}
              onClick={() => setSelectedMood(i)}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all active:scale-90 ${
                selectedMood === i ? 'bg-primary text-on-primary scale-110 shadow-brand-sm' : 'hover:bg-surface-container-high'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-error-container/30 text-on-error-container px-4 py-2.5 rounded-xl font-label-sm text-label-sm">{error}</div>
        )}

        <textarea
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Write about your day..."
          className="w-full min-h-[120px] p-4 rounded-[20px] bg-surface-container-low border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none shadow-ambient-sm transition-all"
        />

        <button
          onClick={handleSave}
          disabled={!entry.trim() || saving}
          className="w-full py-3 rounded-[16px] bg-primary text-on-primary font-bold shadow-brand-md hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-headline-sm text-[20px] text-on-surface mt-2">Past Entries</h2>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-surface-container-low rounded-2xl border border-outline-variant/30 skeleton" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-12 bg-surface rounded-3xl border border-outline-variant/50 border-dashed">
            <div className="w-16 h-16 rounded-2xl bg-primary-container/30 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[32px] text-on-primary-container/60">menu_book</span>
            </div>
            <p className="font-headline-sm text-headline-sm text-on-surface mb-1">No entries yet</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Start journaling!</p>
          </div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-ambient-sm card-hover">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{e.mood}</span>
                  <span className="text-xs text-on-surface-variant/60">{formatDate(e.created_at)}</span>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:bg-error-container/30 hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
              <p className="text-on-surface mt-2 whitespace-pre-wrap leading-relaxed">{e.content}</p>
            </div>
          ))
        )}
      </section>
    </main>
  )
}
