import { useState, useEffect } from 'react'
import { getSuggestedUsers, sendFriendRequest, getFriendRequestStatus } from '../../lib/api'
import type { SuggestedUser } from '../../lib/api'
import { playFriendSound } from '../../lib/notify-sounds'
import { toast } from 'sonner'

interface Props {
  onAddFriend?: () => void
}

export default function SuggestedUsers({ onAddFriend }: Props) {
  const [users, setUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({})
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSuggested()
  }, [])

  const loadSuggested = async () => {
    setLoading(true)
    const { data } = await getSuggestedUsers(10)
    if (data && data.length > 0) {
      setUsers(data)
      const statuses: Record<string, string> = {}
      await Promise.all(
        data.map(async (u) => {
          const { data: status } = await getFriendRequestStatus(u.id)
          if (status) statuses[u.id] = status.status
        })
      )
      setRequestStatuses(statuses)
    }
    setLoading(false)
  }

  const handleSendRequest = async (userId: string) => {
    if (sentRequests.has(userId)) return
    setSentRequests(prev => new Set([...prev, userId]))
    const { data } = await sendFriendRequest(userId)
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

  if (loading || users.length === 0) return null

  return (
    <section className="mb-6">
      <h3 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">explore</span>
        People on Streaks
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {users.map(u => {
          const initials = (u.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          const status = requestStatuses[u.id] || 'none'
          const sent = sentRequests.has(u.id)
          const isFriend = status === 'accepted'
          const isPending = status === 'pending'

          return (
            <div
              key={u.id}
              className="flex flex-col items-center gap-2 p-4 bg-surface border border-outline-variant rounded-2xl min-w-[140px] max-w-[160px] snap-start shrink-0"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="font-headline-md text-on-primary-container font-bold">{initials}</span>
                </div>
              )}
              <p className="font-body-sm text-body-sm font-medium text-on-surface text-center truncate w-full">
                {u.full_name || 'Anonymous'}
              </p>
              {u.university && (
                <p className="font-label-xs text-label-xs text-on-surface-variant text-center truncate w-full">{u.university}</p>
              )}
              <button
                onClick={() => handleSendRequest(u.id)}
                disabled={isFriend || isPending || sent}
                className={`w-full px-4 py-2 rounded-full font-label-sm text-label-sm font-semibold transition-all ${
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
    </section>
  )
}
