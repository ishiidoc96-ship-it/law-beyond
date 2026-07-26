import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getStreakComments,
  addStreakComment,
  deleteStreakComment,
  likeStreakPost,
  unlikeStreakPost,
  type DbStreakComment,
  type DbStreakPost,
} from '../../lib/api'

// Sanitize user content to prevent XSS
function sanitizeContent(content: string): string {
  return content
    .replace(/</g, '\u0026lt;')
    .replace(/>/g, '\u0026gt;')
    .replace(/"/g, '\u0026quot;')
    .replace(/'/g, '\u0026#39;')
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return diffMin + 'm'
  if (diffHr < 24) return diffHr + 'h'
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return diffDay + 'd'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface PostDetailProps {
  post: DbStreakPost & { like_count: number; comment_count: number; user_has_liked: boolean }
  onClose: () => void
  onLikeChange: (postId: string, liked: boolean, newCount: number) => void
}

export default function PostDetail({ post, onClose, onLikeChange }: PostDetailProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<DbStreakComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [liking, setLiking] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseMusic = (raw: string | null): { title: string; artist: string; artwork?: string; preview?: string } | null => {
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return { title: raw.split(' — ')[0] || raw, artist: raw.split(' — ')[1] || '' } }
  }
  const music = parseMusic(post.music_track)

  const profile = post.profiles
  const displayName = profile?.full_name || 'Anonymous'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const loadComments = useCallback(async () => {
    const { data } = await getStreakComments(post.id)
    if (data) setComments(data)
    setLoading(false)
  }, [post.id])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleLike = async () => {
    if (!user || liking) return
    setLiking(true)
    if (post.user_has_liked) {
      await unlikeStreakPost(post.id, user.uid)
      onLikeChange(post.id, false, post.like_count - 1)
    } else {
      await likeStreakPost(post.id, user.uid)
      onLikeChange(post.id, true, post.like_count + 1)
    }
    setLiking(false)
  }

  const handleComment = async () => {
    if (!user || !newComment.trim() || sending) return
    setSending(true)
    setCommentError('')
    try {
      const { data, error } = await addStreakComment(post.id, user.uid, newComment.trim())
      if (error) {
        setCommentError(error.message || 'Failed to post comment')
      } else if (data) {
        setComments(prev => [...prev, data])
        setNewComment('')
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {
      setCommentError('Failed to post comment')
    }
    setSending(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    await deleteStreakComment(commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="Post details">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/50">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
                <span className="font-label-sm text-on-primary-container font-bold">{initials}</span>
              </div>
            )}
            <div>
              <span className="font-body-md text-body-md font-semibold text-on-surface">{displayName}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{timeAgo(post.created_at)}</span>
                {post.location && (
                  <>
                    <span className="text-on-surface-variant/30">·</span>
                    <span className="font-label-sm text-label-sm text-primary flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px]">location_on</span>
                      {post.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button aria-label="Close post" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative w-full aspect-square bg-surface-container-low">
            {post.media_type === 'video' ? (
              <video
                src={post.media_url}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={post.media_url}
                alt={post.caption || 'Streak highlight'}
                className="w-full h-full object-cover"
              />
            )}
            {post.music_track && (
              <div
                className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 cursor-pointer active:scale-95 transition-transform"
                onClick={() => {
                  if (music?.preview) {
                    if (playing && audioRef.current) { audioRef.current.pause(); setPlaying(false) }
                    else {
                      if (audioRef.current) audioRef.current.pause()
                      const audio = new Audio(music.preview)
                      audio.play()
                      audio.onended = () => setPlaying(false)
                      audioRef.current = audio
                      setPlaying(true)
                    }
                  }
                }}
              >
                {music?.artwork ? (
                  <img src={music.artwork} alt="" className={`w-5 h-5 rounded-full object-cover ${playing ? 'animate-spin' : ''}`} style={playing ? { animationDuration: '3s' } : {}} />
                ) : (
                  <span className="material-symbols-outlined text-[14px] text-white animate-spin" style={{ animationDuration: '3s' }}>music_note</span>
                )}
                <span className="font-label-xs text-label-xs text-white truncate max-w-[180px]">{music?.title || 'Music'}</span>
                {music?.preview && (
                  <span className="material-symbols-outlined text-[14px] text-white">{playing ? 'pause_circle' : 'play_circle'}</span>
                )}
              </div>
            )}
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-5 mb-4">
              <button aria-label={post.user_has_liked ? 'Unlike post' : 'Like post'} onClick={handleLike} disabled={liking} className="flex items-center gap-1.5">
                <span className={`material-symbols-outlined text-[24px] transition-all ${post.user_has_liked ? 'text-error' : 'text-on-surface-variant'}`}
                  style={post.user_has_liked ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {post.user_has_liked ? 'favorite' : 'favorite_border'}
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant">{post.like_count}</span>
              </button>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[24px] text-on-surface-variant">chat_bubble_outline</span>
                <span className="font-label-md text-label-md text-on-surface-variant">{comments.length}</span>
              </span>
            </div>

            {post.caption && (
              <p className="font-body-md text-body-md text-on-surface mb-3 leading-relaxed">{sanitizeContent(post.caption)}</p>
            )}
            {post.music_track && (
              <div
                className="flex items-center gap-3 mb-4 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => {
                  if (music?.preview) {
                    if (playing && audioRef.current) { audioRef.current.pause(); setPlaying(false) }
                    else {
                      if (audioRef.current) audioRef.current.pause()
                      const audio = new Audio(music.preview)
                      audio.play()
                      audio.onended = () => setPlaying(false)
                      audioRef.current = audio
                      setPlaying(true)
                    }
                  }
                }}
              >
                {music?.artwork ? (
                  <img src={music.artwork} alt="" className={`w-10 h-10 rounded-lg object-cover flex-shrink-0 ${playing ? 'animate-spin' : ''}`} style={playing ? { animationDuration: '3s' } : {}} />
                ) : (
                  <span className="material-symbols-outlined text-[16px] text-primary animate-spin" style={{ animationDuration: '3s' }}>music_note</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-label-sm text-label-sm font-medium text-on-surface truncate">{music?.title || 'Music'}</p>
                  {music?.artist && <p className="font-label-xs text-xs text-on-surface-variant truncate">{music.artist}</p>}
                </div>
                {music?.preview && (
                  <span className="material-symbols-outlined text-[22px] text-on-surface-variant">{playing ? 'pause_circle' : 'play_circle'}</span>
                )}
              </div>
            )}

            <div className="border-t border-outline-variant/50 pt-4">
              <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Comments</h4>
              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="material-symbols-outlined text-[24px] text-outline-variant animate-spin">progress_activity</span>
                </div>
              ) : comments.length === 0 ? (
                <p className="font-body-md text-body-md text-on-surface-variant text-center py-6">No comments yet. Be the first!</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {comments.map(comment => {
                    const commenterName = comment.profiles?.full_name || 'Anonymous'
                    const commenterInitials = commenterName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <div key={comment.id} className="flex gap-3 group">
                        {comment.profiles?.avatar_url ? (
                          <img src={comment.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                            <span className="font-label-sm text-on-surface-variant font-bold text-[10px]">{commenterInitials}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="bg-surface-container-low rounded-2xl px-4 py-2.5">
                            <span className="font-body-md text-body-md font-semibold text-on-surface">{commenterName}</span>
                            <p className="font-body-md text-body-md text-on-surface">{sanitizeContent(comment.content)}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 px-1">
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{timeAgo(comment.created_at)}</span>
                            {comment.user_id === user?.uid && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="font-label-sm text-label-sm text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={commentsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-outline-variant/50 px-4 py-3 bg-surface flex flex-col gap-2">
          {commentError && (
            <p className="font-label-sm text-label-sm text-error px-2">{commentError}</p>
          )}
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="Add a comment..."
              aria-label="Write a comment"
              className="flex-1 px-4 py-2.5 rounded-full bg-surface-container-low border border-outline-variant font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <button
              aria-label="Send comment"
              onClick={handleComment}
              disabled={!newComment.trim() || sending}
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}