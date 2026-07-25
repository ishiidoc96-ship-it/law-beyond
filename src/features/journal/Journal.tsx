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
      content: entry.trim(),
      mood: moods[selectedMood],
      prompt: 'What made you a better version of yourself today?',
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
    const { error } = await deleteJournalEntry(id, user.id)
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
  }

  return (
    <main className="w-full max-w-2xl mx-auto px-5 py-6 flex flex-col gap-6 relative z-10 pb-32">
      <section className="flex flex-col gap-4 mt-4 md:mt-0">
        <h1 className="font-headline-lg text-[32px] leading-[40px] tracking-[-0.02em] font-bold text-on-surface">How are you today?</h1>
        <div className="flex justify-between items-center bg-surface-container-lowest border border-outline/20 rounded-[24px] p-3 shadow-sm">
          {moods.map((mood, i) => (
            <button
              key={i}
              onClick={() => setSelectedMood(i)}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-[24px] hover:bg-surface-container-high transition-colors focus:ring-2 focus:ring-primary/50 outline-none ${
                selectedMood === i ? 'bg-primary-container scale-110 shadow-sm border border-primary/20' : ''
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 relative group">
        {error && (
          <div className="bg-error-container/30 text-on-error-container px-4 py-2.5 rounded-xl font-label-sm text-label-sm">
            {error}
          </div>
        )}
        <div className="bg-surface-container-lowest border border-outline/20 rounded-[24px] p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden z-10 transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-md focus-within:ring-2">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <p className="font-body-md text-body-md text-on-surface font-medium leading-relaxed font-semibold">
              What made you a better version of yourself today?
            </p>
          </div>
          <textarea
            className="w-full min-h-[160px] bg-transparent border-none text-on-surface font-body-md text-body-md placeholder:text-outline focus:ring-0 resize-none p-0 mt-2"
            placeholder="Start typing your thoughts..."
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
          />
        </div>
      </section>

      <section className="flex items-center gap-4 mt-2">
        <button
          onClick={handleSave}
          disabled={!entry.trim() || saving}
          className="flex-1 h-14 rounded-[24px] bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </section>

      <section className="mt-6 flex flex-col gap-4">
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-2">Previous Entries</h2>
        {loading ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-outline text-[40px] animate-spin">progress_activity</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-outline text-[48px]">menu_book</span>
            <p className="font-body-md text-on-surface-variant">No entries yet. Start journaling!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((e) => (
              <article key={e.id} className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline/20 hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-2 relative overflow-hidden group shadow-sm hover:-translate-y-1">
                <div className="flex justify-between items-center w-full">
                  <span className="font-label-md text-label-md text-on-surface-variant">{formatDate(e.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">{e.mood}</span>
                    <button
                      aria-label="Delete entry"
                      onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-error-container hover:text-error transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">close</span>
                    </button>
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{e.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
