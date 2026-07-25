import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getFriendRequests, respondFriendRequest } from '../../lib/api'
import type { DbFriendRequest } from '../../lib/api'
import { playFriendSound } from '../../lib/notify-sounds'
import { toast } from 'sonner'

interface PendingRequestsProps {
  onRequestHandled?: () => void
}

export default function PendingRequests({ onRequestHandled }: PendingRequestsProps) {
  const { user } = useAuth()
  const [requests, setRequests] = useState<DbFriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [handlingId, setHandlingId] = useState<string | null>(null)

  const fetchRequests = async () => {
    if (!user) return
    const { data } = await getFriendRequests(user.id)
    if (data) setRequests(data)
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [user])

  const handleRespond = async (requestId: string, accept: boolean) => {
    if (handlingId) return
    setHandlingId(requestId)
    await respondFriendRequest(requestId, accept)
    setRequests(prev => prev.filter(r => r.id !== requestId))
    setHandlingId(null)
    if (accept) {
      toast.success('Friend request accepted!')
      playFriendSound()
    } else {
      toast('Request declined')
    }
    onRequestHandled?.()
  }

  if (loading) return null
  if (requests.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">person_add</span>
        Pending Requests ({requests.length})
      </h3>
      <div className="flex flex-col gap-2">
        {requests.map(r => {
          const s = r.sender
          const initials = (s?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          return (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl">
              {s?.avatar_url ? (
                <img src={s.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="font-label-sm text-on-primary-container font-bold">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md font-medium text-on-surface truncate">{s?.full_name || 'Someone'}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">wants to be friends</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespond(r.id, false)}
                  disabled={handlingId === r.id}
                  className="w-9 h-9 rounded-full border border-outline-variant flex items-center justify-center hover:bg-error-container/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">close</span>
                </button>
                <button
                  onClick={() => handleRespond(r.id, true)}
                  disabled={handlingId === r.id}
                  className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-on-primary">check</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
