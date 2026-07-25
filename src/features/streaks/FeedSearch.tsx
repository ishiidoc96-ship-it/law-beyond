import { useState, useCallback, useRef, useEffect } from 'react'
import { searchUsers, sendFriendRequest, getFriendRequestStatus } from '../../lib/api'
import { playFriendSound } from '../../lib/notify-sounds'
import { toast } from 'sonner'

interface SearchResult {
  id: string
  full_name: string | null
  avatar_url: string | null
  university: string | null
}

interface Props {
  onAddFriend?: () => void
}

export default function FeedSearch({ onAddFriend }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({})
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const { data } = await searchUsers(q)
      if (data) {
        setResults(data as SearchResult[])
        const statuses: Record<string, string> = {}
        await Promise.all(
          (data as SearchResult[]).map(async (u) => {
            const { data: status } = await getFriendRequestStatus(u.id)
            if (status) statuses[u.id] = status.status
          })
        )
        setRequestStatuses(statuses)
      }
      setLoading(false)
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleSendRequest = async (userId: string) => {
    if (sentRequests.has(userId)) return
    setSentRequests(prev => new Set([...prev, userId]))
    const { data, error } = await sendFriendRequest(userId)
    if (error) {
      toast.error(typeof error === 'string' ? error : error?.message || 'Failed to send request')
      return
    }
    if (data?.success) {
      const action = data.action
      if (action === 'auto_accepted') {
        toast.success('Friend added! You can now start a streak together.')
      } else {
        toast.success('Friend request sent!')
      }
      playFriendSound()
      setRequestStatuses(prev => ({ ...prev, [userId]: action === 'auto_accepted' ? 'accepted' : 'pending' }))
      onAddFriend?.()
    } else {
      toast.error('Failed to send request')
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setFocused(false)
    inputRef.current?.blur()
  }

  const showResults = focused && query.length >= 2

  return (
    <div className="relative mb-6">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">search</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search people by name or email..."
          className="w-full pl-11 pr-10 py-3.5 bg-surface-container-low border border-outline-variant/50 rounded-2xl font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
        {(query.length > 0 || focused) && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">close</span>
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-surface border border-outline-variant rounded-2xl shadow-lg max-h-[360px] overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-6">
              <span className="material-symbols-outlined text-primary animate-spin text-[24px]">progress_activity</span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[32px] text-outline-variant mb-1">person_search</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">No users found</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              {results.map(u => {
                const initials = (u.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const sent = sentRequests.has(u.id)
                const status = requestStatuses[u.id] || 'none'
                const isFriend = status === 'accepted'
                const isPending = status === 'pending'

                return (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                        <span className="font-label-sm text-on-primary-container font-bold">{initials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md font-medium text-on-surface truncate">{u.full_name || 'Anonymous'}</p>
                      {u.university && <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{u.university}</p>}
                    </div>
                    <button
                      onClick={() => handleSendRequest(u.id)}
                      disabled={isFriend || isPending || sent}
                      className={`px-4 py-2 rounded-full font-label-sm text-label-sm font-semibold transition-all ${
                        isFriend
                          ? 'bg-surface-container-high text-on-surface-variant cursor-default'
                          : isPending || sent
                          ? 'bg-surface-container-high text-on-surface-variant cursor-default'
                          : 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
                      }`}
                    >
                      {isFriend ? 'Friends' : isPending || sent ? 'Pending' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
