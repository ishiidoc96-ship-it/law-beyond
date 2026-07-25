import { useState, useRef, memo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  likeStreakPost,
  unlikeStreakPost,
  deleteStreakPost,
  type DbStreakPost,
} from '../../lib/api'
import { getMilestoneForStreak } from '../../lib/streak-milestones'
import { playLikeSound, playSuccessSound } from '../../lib/notify-sounds'
import { hapticSuccess, hapticError } from '../../lib/haptics'
import { toast } from 'sonner'

// Sanitize user content to prevent XSS
function sanitizeContent(content: string): string {
  return content
    .replace(/</g, '\u0026lt;')
    .replace(/>/g, '\u0026gt;')
    .replace(/"/g, '\u0026quot;')
    .replace(/'/g, '\u0026#39;')
}

interface StreakPostProps {
  post: DbStreakPost & { like_count: number; comment_count: number; user_has_liked: boolean; poster_streak?: number }
  onOpen: (post: StreakPostProps['post']) => void
  onDeleted: (postId: string) => void
  onLikeChange: (postId: string, liked: boolean, newCount: number) => void
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return diffMin + 'm ago'
  if (diffHr < 24) return diffHr + 'h ago'
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return diffDay + 'd ago'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default memo(function StreakPost({ post, onOpen, onDeleted, onLikeChange }: StreakPostProps) {
  const { user } = useAuth()
  const [liking, setLiking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Parse music_track (could be JSON or plain string)
  const parseMusic = (raw: string | null): { title: string; artist: string; artwork?: string; preview?: string } | null => {
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return { title: raw.split(' — ')[0] || raw, artist: raw.split(' — ')[1] || '' } }
  }
  const music = parseMusic(post.music_track)

  const isOwner = user?.id === post.user_id
  const profile = post.profiles
  const displayName = profile?.full_name || 'Anonymous'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const posterMilestone = getMilestoneForStreak(post.poster_streak ?? 0)

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || liking) return
    setLiking(true)
    if (post.user_has_liked) {
      await unlikeStreakPost(post.id, user.id)
      onLikeChange(post.id, false, post.like_count - 1)
      hapticError()
    } else {
      await likeStreakPost(post.id, user.id)
      onLikeChange(post.id, true, post.like_count + 1)
      playLikeSound()
      hapticSuccess()
    }
    setLiking(false)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleting) return
    setDeleting(true)
    await deleteStreakPost(post.id)
    onDeleted(post.id)
    toast.success('Post deleted')
    playSuccessSound()
    hapticSuccess()
  }

  return (
    <article className="group bg-surface border border-outline-variant/30 rounded-[24px] overflow-hidden shadow-ambient-sm hover:shadow-ambient-md transition-all duration-300">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-surface-container-low" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center ring-2 ring-surface-container-low">
              <span className="font-label-md text-on-primary-container font-bold">{initials}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-body-md text-body-md font-semibold text-on-surface block leading-tight">{displayName}</span>
              {posterMilestone && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10" title={`${posterMilestone.days}-day streak: ${posterMilestone.title}`}>
                  <span className="material-symbols-outlined text-[12px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{posterMilestone.icon}</span>
                  <span className="font-label-xs text-label-xs text-primary font-bold">{posterMilestone.days}</span>
                </span>
              )}
            </div>
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
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label={deleting ? 'Deleting post' : 'Delete post'}
            className="w-8 h-8 rounded-full hover:bg-error-container/30 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              {deleting ? 'progress_activity' : 'delete'}
            </span>
          </button>
        )}
      </div>

      <div
        className="relative w-full aspect-square bg-surface-container-low cursor-pointer group"
        onClick={() => onOpen(post)}
      >
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low">
            <span className="material-symbols-outlined text-[32px] text-outline-variant animate-spin">progress_activity</span>
          </div>
        )}
        {post.media_type === 'video' ? (
          <div className="relative w-full h-full">
            <video
              src={post.media_url}
              playsInline
              muted
              preload="metadata"
              className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoadedData={() => setImgLoaded(true)}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                <span className="material-symbols-outlined text-[28px] text-on-inverse-surface">play_arrow</span>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={post.media_url}
            alt={post.caption || 'Streak highlight'}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {post.music_track && (
          <div
            className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 cursor-pointer active:scale-95 transition-transform"
            onClick={(e) => {
              e.stopPropagation()
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
              <span className="material-symbols-outlined text-[12px] text-white animate-spin" style={{ animationDuration: '3s' }}>music_note</span>
            )}
            <span className="font-label-xs text-label-xs text-white truncate max-w-[100px]">{music?.title || 'Music'}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        {post.caption && (
          <p className="font-body-md text-body-md text-on-surface mb-2 leading-relaxed">{sanitizeContent(post.caption)}</p>
        )}
        {post.music_track && (
          <div
            className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={(e) => {
              e.stopPropagation()
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
              <img src={music.artwork} alt="" className={`w-9 h-9 rounded-lg object-cover flex-shrink-0 ${playing ? 'animate-spin' : ''}`} style={playing ? { animationDuration: '3s' } : {}} />
            ) : (
              <span className="material-symbols-outlined text-[16px] text-primary animate-spin" style={{ animationDuration: '3s' }}>music_note</span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-label-sm text-label-sm font-medium text-on-surface truncate">{music?.title || 'Music'}</p>
              {music?.artist && <p className="font-label-xs text-xs text-on-surface-variant truncate">{music.artist}</p>}
            </div>
            {music?.preview && (
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                {playing ? 'pause_circle' : 'play_circle'}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-5">
          <button
            aria-label={post.user_has_liked ? 'Unlike post' : 'Like post'}
            onClick={handleLike}
            disabled={liking}
            className="flex items-center gap-1.5 group/like"
          >
            <span className={`material-symbols-outlined text-[22px] transition-all duration-200 ${post.user_has_liked ? 'text-error fill-error' : 'text-on-surface-variant group-hover/like:text-error'}`} style={post.user_has_liked ? { fontVariationSettings: "'FILL' 1" } : {}}>
              {post.user_has_liked ? 'favorite' : 'favorite_border'}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">{post.like_count}</span>
          </button>

          <button
            aria-label={`View ${post.comment_count} comments`}
            onClick={(e) => { e.stopPropagation(); onOpen(post) }}
            className="flex items-center gap-1.5 group/comment"
          >
            <span className="material-symbols-outlined text-[22px] text-on-surface-variant group-hover/comment:text-primary transition-colors">
              chat_bubble_outline
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">{post.comment_count}</span>
          </button>

          <span className="ml-auto flex items-center gap-1 text-secondary-container">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            {post.poster_streak != null && post.poster_streak > 0 && (
              <span className="font-label-sm text-label-sm font-semibold text-secondary-container">{post.poster_streak}</span>
            )}
          </span>
        </div>
      </div>
    </article>
  )
})