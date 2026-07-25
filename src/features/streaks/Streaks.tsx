import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getStreakFeed, getUserStreakStats, getTotalStreakPostCount } from '../../lib/api'
import type { DbStreakPost } from '../../lib/api'
import type { DbUserStreak } from '../../lib/api'
import { hapticTap } from '../../lib/haptics'
import type { MediaType } from '../../lib/cloudinary'
import { isVideoFile } from '../../lib/cloudinary'
import { getMilestoneForStreak, getNextMilestone, getMilestoneProgress } from '../../lib/streak-milestones'
import StreakPost from './StreakPost'
import StreakCalendar from './StreakCalendar'
import StreakHourglass from './StreakHourglass'
import StreakFreezeButton from './StreakFreezeButton'
import FriendsList from './FriendsList'
import FriendSearch from './FriendSearch'
import PendingRequests from './PendingRequests'
import SuggestedUsers from './SuggestedUsers'
import FeedSearch from './FeedSearch'
import NotificationPrompt from '../notifications/NotificationPrompt'
import CreatePostModal from './CreatePostModal'
import PostDetail from './PostDetail'

type FeedPost = DbStreakPost & { like_count: number; comment_count: number; user_has_liked: boolean }
type Tab = 'feed' | 'friends' | 'discover' | 'calendar'

export default function Streaks() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null)
  const [streakData, setStreakData] = useState<DbUserStreak | null>(null)
  const [totalPosts, setTotalPosts] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [initialFile, setInitialFile] = useState<File | null>(null)
  const [initialMediaType, setInitialMediaType] = useState<MediaType | undefined>()
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const currentStreak = streakData?.current_streak ?? 0
  const longestStreak = streakData?.longest_streak ?? 0
  const milestone = getMilestoneForStreak(currentStreak)
  const nextMilestone = getNextMilestone(currentStreak)
  const milestoneProgress = getMilestoneProgress(currentStreak)

  const fetchFeed = useCallback(async () => {
    if (!user) return
    const [feedRes, statsRes, countRes] = await Promise.all([
      getStreakFeed(user.id),
      getUserStreakStats(user.id),
      getTotalStreakPostCount(user.id),
    ])
    if (feedRes.data) setPosts(feedRes.data)
    if (statsRes.data) setStreakData(statsRes.data)
    setTotalPosts(countRes.count)
    setLoading(false)
  }, [user])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setTotalPosts(prev => Math.max(0, prev - 1))
  }

  const handleLikeChange = (postId: string, liked: boolean, newCount: number) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, user_has_liked: liked, like_count: newCount } : p
    ))
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? { ...prev, user_has_liked: liked, like_count: newCount } : null)
    }
  }

  const handlePostCreated = () => {
    setInitialFile(null)
    setInitialMediaType(undefined)
    setTotalPosts(prev => prev + 1)
    fetchFeed()
  }

  const handleFreezeUsed = () => {
    fetchFeed()
  }

  const handleCameraSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    const type: MediaType = isVideoFile(selected) ? 'video' : 'image'
    setInitialFile(selected)
    setInitialMediaType(type)
    setCreateOpen(true)
    e.target.value = ''
  }, [])

  return (
    <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
      {/* Header */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-headline-lg text-[28px] md:text-[32px] leading-tight tracking-[-0.02em] font-bold text-on-surface">
            Streaks
          </h1>
          <div className="flex items-center gap-2">
            <StreakFreezeButton
              freezeAvailable={streakData?.freeze_available ?? 0}
              currentStreak={currentStreak}
              onFreezeUsed={handleFreezeUsed}
            />
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label-md text-label-md font-bold hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">Post</span>
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 bg-secondary text-on-secondary px-5 py-2.5 rounded-full font-label-md text-label-md font-bold hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              <span className="hidden sm:inline">Camera</span>
            </button>
          </div>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Share your daily highlights and stay consistent.
        </p>
      </section>

      {/* Hourglass Warning */}
      <StreakHourglass lastPostDate={streakData?.last_post_date ?? null} currentStreak={currentStreak} />

      {/* Notification Prompt */}
      <NotificationPrompt />

      {/* Streak Stats */}
      <section className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Current Streak */}
          <div className="bg-gradient-to-br from-primary-container to-primary rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-brand-md">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            {milestone && (
              <span className="font-label-xs text-label-xs text-on-primary/80 mb-0.5">{milestone.emoji}</span>
            )}
            <span className="material-symbols-outlined text-[32px] text-on-primary mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="font-display-lg text-display-lg text-on-primary">{currentStreak}</span>
            <span className="font-label-sm text-label-sm text-on-primary/80 uppercase tracking-wider">Day Streak</span>
          </div>

          {/* Best Streak */}
          <div className="bg-gradient-to-br from-surface-container-low to-surface-container-high border border-outline-variant/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-ambient-sm hover:shadow-ambient-md transition-shadow">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-secondary-container/10 rounded-full blur-xl" />
            <div className="w-10 h-10 rounded-xl bg-secondary-container/15 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-[22px] text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            </div>
            <span className="font-headline-md text-headline-md text-on-surface">{longestStreak}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Best Streak</span>
          </div>

          {/* Total Posts — real count */}
          <div className="bg-gradient-to-br from-surface-container-low to-surface-container-high border border-outline-variant/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-ambient-sm hover:shadow-ambient-md transition-shadow">
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-tertiary/10 rounded-full blur-xl" />
            <div className="w-10 h-10 rounded-xl bg-tertiary/15 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-[22px] text-tertiary">photo_library</span>
            </div>
            <span className="font-headline-md text-headline-md text-on-surface">{totalPosts}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Posts</span>
          </div>

          {/* Next Milestone */}
          <div className="bg-gradient-to-br from-surface-container-low to-surface-container-high border border-outline-variant/30 rounded-2xl p-5 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1 relative overflow-hidden shadow-ambient-sm hover:shadow-ambient-md transition-shadow">
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-warning/10 rounded-full blur-xl" />
            {nextMilestone ? (
              <>
                <span className="material-symbols-outlined text-[28px] text-on-surface-variant mb-1">{nextMilestone.icon}</span>
                <span className="font-headline-md text-headline-md text-on-surface">{nextMilestone.days - currentStreak}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">To {nextMilestone.title}</span>
                <div className="w-full bg-outline-variant/30 rounded-full h-1.5 mt-2">
                  <div className="bg-primary rounded-full h-1.5 transition-all duration-500" style={{ width: `${milestoneProgress}%` }} />
                </div>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[28px] text-warning mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                <span className="font-headline-md text-headline-md text-on-surface">Max</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">All Milestones!</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="mb-6">
        <div className="flex gap-1 bg-surface-container rounded-full p-1 w-fit glass">
          {([
            { id: 'feed' as Tab, icon: 'dynamic_feed', label: 'Feed' },
            { id: 'discover' as Tab, icon: 'explore', label: 'Discover' },
            { id: 'friends' as Tab, icon: 'group', label: 'Friends' },
            { id: 'calendar' as Tab, icon: 'calendar_month', label: 'Calendar' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'filled' : ''}`}>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Content */}
      {activeTab === 'calendar' && <StreakCalendar currentStreak={currentStreak} />}

      {activeTab === 'discover' && (
        <section>
          <div className="mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-primary">explore</span>
              Discover People
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Find and connect with fellow law students</p>
          </div>
          <div className="mb-6">
            <FriendSearch />
          </div>
          <div>
            <h3 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
              Popular on Streaks
            </h3>
            <SuggestedUsers onAddFriend={fetchFeed} />
          </div>
        </section>
      )}

      {activeTab === 'friends' && (
        <section>
          <PendingRequests onRequestHandled={fetchFeed} />
          <div className="mb-6">
            <h3 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Find People
            </h3>
            <FriendSearch />
          </div>
          <div>
            <h3 className="font-label-md text-label-md text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">group</span>
              Your Friends
            </h3>
            <FriendsList onRefresh={fetchFeed} />
          </div>
        </section>
      )}

      {activeTab === 'feed' && (
        <section>
          <FeedSearch onAddFriend={fetchFeed} />
          <SuggestedUsers onAddFriend={fetchFeed} />

          {loading ? (
            <div className="flex flex-col gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="bg-surface border border-outline-variant/30 rounded-[24px] overflow-hidden shadow-ambient-sm animate-pulse">
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high" />
                    <div className="flex-1">
                      <div className="h-4 bg-surface-container-high rounded w-24 mb-1" />
                      <div className="h-3 bg-surface-container-low rounded w-16" />
                    </div>
                  </div>
                  <div className="w-full aspect-square bg-surface-container-low" />
                  <div className="px-4 py-3">
                    <div className="h-4 bg-surface-container-high rounded w-3/4 mb-2" />
                    <div className="h-3 bg-surface-container-low rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-surface border border-outline-variant/30 border-dashed rounded-[24px] shadow-ambient-sm">
              <div className="w-20 h-20 rounded-2xl bg-primary-container/50 flex items-center justify-center mb-4 shadow-brand-sm">
                <span className="material-symbols-outlined text-[40px] text-on-primary-container">add_a_photo</span>
              </div>
              <p className="font-headline-md text-headline-md text-on-surface mb-2">No highlights yet</p>
              <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-sm mb-6 leading-relaxed">
                Start your streak by posting your first daily highlight. Stay consistent and watch your streak grow!
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md text-label-md font-bold hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center gap-2 shadow-brand-md"
              >
                <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
                Post Your First Highlight
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map(post => (
                <StreakPost
                  key={post.id}
                  post={post}
                  onOpen={setSelectedPost}
                  onDeleted={handlePostDeleted}
                  onLikeChange={handleLikeChange}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* FABs */}
      <button
        aria-label="Create new post"
        onClick={() => { hapticTap(); setCreateOpen(true) }}
        className="md:hidden fixed bottom-[96px] right-4 w-14 h-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-brand-xl hover:scale-105 transition-all z-40 active:scale-95"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>
      <button
        aria-label="Take a photo or video"
        onClick={() => { hapticTap(); cameraInputRef.current?.click() }}
        className="md:hidden fixed bottom-[96px] right-20 w-14 h-14 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-brand-xl hover:scale-105 transition-all z-40 active:scale-95"
      >
        <span className="material-symbols-outlined text-[28px]">photo_camera</span>
      </button>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
        capture="environment"
        className="hidden"
        onChange={handleCameraSelect}
      />

      <CreatePostModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setInitialFile(null); setInitialMediaType(undefined) }}
        onCreated={handlePostCreated}
        initialFile={initialFile ?? undefined}
        initialMediaType={initialMediaType}
      />

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLikeChange={handleLikeChange}
        />
      )}
    </main>
  )
}
