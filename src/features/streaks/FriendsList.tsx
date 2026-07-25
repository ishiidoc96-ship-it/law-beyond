import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getFriends, removeFriend } from '../../lib/api'
import type { DbFriend } from '../../lib/api'
import { toast } from 'sonner'

interface FriendsListProps {
  onRefresh?: () => void
}

export default function FriendsList({ onRefresh }: FriendsListProps) {
  const { user } = useAuth()
  const [friends, setFriends] = useState<DbFriend[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    getFriends(user.id).then(({ data }) => {
      if (data) setFriends(data)
      setLoading(false)
    })
  }, [user])

  const handleRemove = async (friendId: string) => {
    if (!user || removingId) return
    setRemovingId(friendId)
    await removeFriend(friendId)
    setFriends(prev => prev.filter(f => f.friend_id !== friendId))
    setRemovingId(null)
    toast.success('Friend removed')
    onRefresh?.()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="material-symbols-outlined text-primary animate-spin text-[28px]">progress_activity</span>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="material-symbols-outlined text-[48px] text-outline-variant mb-2">group</span>
        <p className="font-body-md text-body-md text-on-surface-variant">No friends yet</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant/70 mt-1">Search and add people to start streaks together!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {friends.map(f => {
        const initials = (f.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        return (
          <div key={f.friend_id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container-low transition-colors group">
            {f.avatar_url ? (
              <img src={f.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center">
                <span className="font-label-md text-on-primary-container font-bold">{initials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-body-md text-body-md font-medium text-on-surface truncate">{f.full_name || 'Anonymous'}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Friends since {new Date(f.friends_since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => handleRemove(f.friend_id)}
              disabled={removingId === f.friend_id}
              className="w-8 h-8 rounded-full hover:bg-error-container/30 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
              title="Remove friend"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                {removingId === f.friend_id ? 'progress_activity' : 'person_remove'}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
