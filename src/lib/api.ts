import { pb } from './pb'
import type { RecordModel } from 'pocketbase'
import { getCurrentUserId } from './pb'

// ── Helpers ──
function handleResult<T>(data: T | null, error?: any): { data: T | null; error: any } {
  return { data, error: error || null }
}

function pbError(e: any): { message: string } {
  return { message: e?.message || 'Unknown error' }
}

// ── Tasks ──
export interface DbTask {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  created_at: string
  updated_at: string
}

export async function getTasks(userId: string) {
  try {
    const records = await pb.collection('tasks').getFullList({
      filter: `user = "${userId}"`,
      sort: 'due_date',
    })
    return handleResult<DbTask[]>(records.map(mapTask))
  } catch (e) { return handleResult<DbTask[]>(null, pbError(e)) }
}

export async function createTask(userId: string, task: { title: string; description?: string; due_date?: string; priority?: string }) {
  try {
    const record = await pb.collection('tasks').create({
      user: userId, title: task.title, description: task.description || '',
      due_date: task.due_date || null, priority: task.priority || 'medium', completed: false,
    })
    return handleResult<DbTask>(mapTask(record))
  } catch (e) { return handleResult<DbTask>(null, pbError(e)) }
}

export async function updateTask(taskId: string, updates: Partial<DbTask>) {
  try {
    const data: any = {}
    if (updates.title !== undefined) data.title = updates.title
    if (updates.description !== undefined) data.description = updates.description
    if (updates.due_date !== undefined) data.due_date = updates.due_date
    if (updates.priority !== undefined) data.priority = updates.priority
    if (updates.completed !== undefined) data.completed = updates.completed
    const record = await pb.collection('tasks').update(taskId, data)
    return handleResult<DbTask>(mapTask(record))
  } catch (e) { return handleResult<DbTask>(null, pbError(e)) }
}

export async function deleteTask(taskId: string, _userId: string) {
  try {
    await pb.collection('tasks').delete(taskId)
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

function mapTask(r: RecordModel): DbTask {
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    title: r.title, description: r.description || null,
    due_date: r.due_date || null, priority: r.priority || 'medium',
    completed: r.completed || false,
    created_at: r.created || new Date().toISOString(),
    updated_at: r.updated || new Date().toISOString(),
  }
}

// ── Habits ──
export interface DbHabit {
  id: string; user_id: string; name: string; category: string | null; icon: string; target_per_day: number; created_at: string
}
export interface DbHabitCompletion {
  id: string; habit_id: string; user_id: string; completed_date: string; created_at: string
}

function mapHabit(r: RecordModel): DbHabit {
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    name: r.name, category: r.category || null, icon: r.icon || 'check_circle',
    target_per_day: r.target_per_day || 1,
    created_at: r.created || new Date().toISOString(),
  }
}

function mapHabitCompletion(r: RecordModel): DbHabitCompletion {
  return {
    id: r.id, habit_id: typeof r.habit === 'string' ? r.habit : r.habit?.id || '',
    user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    completed_date: r.completed_date || '',
    created_at: r.created || new Date().toISOString(),
  }
}

export async function getHabits(userId: string) {
  try {
    const records = await pb.collection('habits').getFullList({ filter: `user = "${userId}"`, sort: '-created' })
    return handleResult<DbHabit[]>(records.map(mapHabit))
  } catch (e) { return handleResult<DbHabit[]>(null, pbError(e)) }
}

export async function createHabit(userId: string, habit: { name: string; category?: string; icon?: string; target_per_day?: number }) {
  try {
    const record = await pb.collection('habits').create({
      user: userId, name: habit.name, category: habit.category || null,
      icon: habit.icon || 'check_circle', target_per_day: habit.target_per_day || 1,
    })
    return handleResult<DbHabit>(mapHabit(record))
  } catch (e) { return handleResult<DbHabit>(null, pbError(e)) }
}

export async function deleteHabit(habitId: string) {
  try {
    await pb.collection('habits').delete(habitId)
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

export async function getHabitCompletions(userId: string, date?: string) {
  try {
    const today = date || new Date().toISOString().split('T')[0]
    const records = await pb.collection('habit_completions').getFullList({
      filter: `user = "${userId}" && completed_date = "${today}"`,
    })
    return handleResult<DbHabitCompletion[]>(records.map(mapHabitCompletion))
  } catch (e) { return handleResult<DbHabitCompletion[]>(null, pbError(e)) }
}

export async function toggleHabitCompletion(userId: string, habitId: string, date: string) {
  try {
    const existing = await pb.collection('habit_completions').getFullList({
      filter: `user = "${userId}" && habit = "${habitId}" && completed_date = "${date}"`,
    })
    if (existing.length > 0) {
      await pb.collection('habit_completions').delete(existing[0].id)
      return handleResult<{ completed: boolean }>({ completed: false })
    } else {
      await pb.collection('habit_completions').create({ user: userId, habit: habitId, completed_date: date })
      return handleResult<{ completed: boolean }>({ completed: true })
    }
  } catch (e) { return handleResult<{ completed: boolean }>(null, pbError(e)) }
}

// ── Journal ──
export interface DbJournalEntry {
  id: string; user_id: string; title: string; content: string; mood: string | null; created_at: string; updated_at: string
}

function mapJournal(r: RecordModel): DbJournalEntry {
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    title: r.title, content: r.content || '', mood: r.mood || null,
    created_at: r.created || new Date().toISOString(),
    updated_at: r.updated || new Date().toISOString(),
  }
}

export async function getJournalEntries(userId: string) {
  try {
    const records = await pb.collection('journal_entries').getFullList({ filter: `user = "${userId}"`, sort: '-created' })
    return handleResult<DbJournalEntry[]>(records.map(mapJournal))
  } catch (e) { return handleResult<DbJournalEntry[]>(null, pbError(e)) }
}

export async function createJournalEntry(userId: string, entry: { title: string; content?: string; mood?: string }) {
  try {
    const record = await pb.collection('journal_entries').create({ user: userId, ...entry })
    return handleResult<DbJournalEntry>(mapJournal(record))
  } catch (e) { return handleResult<DbJournalEntry>(null, pbError(e)) }
}

export async function deleteJournalEntry(entryId: string) {
  try {
    await pb.collection('journal_entries').delete(entryId)
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── Transactions ──
export interface DbTransaction {
  id: string; user_id: string; title: string; amount: number; type: 'income' | 'expense'; category: string; date: string; created_at: string
}

function mapTransaction(r: RecordModel): DbTransaction {
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    title: r.title, amount: r.amount, type: r.type, category: r.category,
    date: r.date || '', created_at: r.created || new Date().toISOString(),
  }
}

export async function getTransactions(userId: string) {
  try {
    const records = await pb.collection('transactions').getFullList({ filter: `user = "${userId}"`, sort: '-created' })
    return handleResult<DbTransaction[]>(records.map(mapTransaction))
  } catch (e) { return handleResult<DbTransaction[]>(null, pbError(e)) }
}

export async function createTransaction(userId: string, tx: { title: string; amount: number; type: string; category: string; date: string }) {
  try {
    const record = await pb.collection('transactions').create({ user: userId, ...tx })
    return handleResult<DbTransaction>(mapTransaction(record))
  } catch (e) { return handleResult<DbTransaction>(null, pbError(e)) }
}

export async function deleteTransaction(txId: string) {
  try {
    await pb.collection('transactions').delete(txId)
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── Assignments ──
export interface DbAssignment {
  id: string; user_id: string; title: string; description: string | null; due_date: string | null; priority: 'high' | 'medium' | 'low'; completed: boolean; created_at: string; updated_at: string
}

function mapAssignment(r: RecordModel): DbAssignment {
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    title: r.title, description: r.description || null, due_date: r.due_date || null,
    priority: r.priority || 'medium', completed: r.completed || false,
    created_at: r.created || new Date().toISOString(), updated_at: r.updated || new Date().toISOString(),
  }
}

export async function getAssignments(userId: string) {
  try {
    const records = await pb.collection('assignments').getFullList({ filter: `user = "${userId}"`, sort: 'due_date' })
    return handleResult<DbAssignment[]>(records.map(mapAssignment))
  } catch (e) { return handleResult<DbAssignment[]>(null, pbError(e)) }
}

export async function createAssignment(userId: string, a: { title: string; description?: string; due_date?: string; priority?: string }) {
  try {
    const record = await pb.collection('assignments').create({
      user: userId, title: a.title, description: a.description || '', due_date: a.due_date || null,
      priority: a.priority || 'medium', completed: false,
    })
    return handleResult<DbAssignment>(mapAssignment(record))
  } catch (e) { return handleResult<DbAssignment>(null, pbError(e)) }
}

export async function updateAssignment(id: string, updates: Partial<DbAssignment>) {
  try {
    const data: any = {}
    if (updates.title !== undefined) data.title = updates.title
    if (updates.description !== undefined) data.description = updates.description
    if (updates.due_date !== undefined) data.due_date = updates.due_date
    if (updates.priority !== undefined) data.priority = updates.priority
    if (updates.completed !== undefined) data.completed = updates.completed
    const record = await pb.collection('assignments').update(id, data)
    return handleResult<DbAssignment>(mapAssignment(record))
  } catch (e) { return handleResult<DbAssignment>(null, pbError(e)) }
}

export async function deleteAssignment(id: string) {
  try { await pb.collection('assignments').delete(id); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── Streak Posts ──
export interface DbStreakPost {
  id: string; user_id: string; media_url: string; media_type: 'image' | 'video'; caption: string | null;
  filter_name: string | null; music_track: string | null; location: string | null; streak_day: number | null;
  created_at: string; profiles?: { full_name: string | null; avatar_url: string | null } | null
}

function mapStreakPost(r: RecordModel): DbStreakPost {
  const expand = r.expand || {}
  const userRecord = expand.user
  let profiles = null
  if (userRecord) {
    // User record from auth - get profile via expand
    const profileExpand = userRecord.expand?.profile || userRecord.expand?.profiles
    if (profileExpand) {
      profiles = { full_name: profileExpand.full_name || null, avatar_url: profileExpand.avatar_url || null }
    } else {
      profiles = { full_name: userRecord.name || userRecord.username || null, avatar_url: null }
    }
  }
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    media_url: r.media_url, media_type: r.media_type || 'image',
    caption: r.caption || null, filter_name: r.filter_name || null,
    music_track: r.music_track || null, location: r.location || null,
    streak_day: r.streak_day || null,
    created_at: r.created || new Date().toISOString(),
    profiles,
  }
}

export type FeedPost = DbStreakPost & { like_count: number; comment_count: number; user_has_liked: boolean; poster_streak?: number }

export async function getStreakFeed(userId: string) {
  try {
    // Get friend IDs
    const friendIds = await getFriendIds(userId)

    // Fetch posts from friends + self
    const allIds = [userId, ...friendIds]
    if (allIds.length === 0) return handleResult<FeedPost[]>([])

    const posts = await pb.collection('streak_posts').getFullList({
      sort: '-created',
      expand: 'user',
      filter: allIds.map(id => `user = "${id}"`).join(' || '),
    })

    // Enrich with likes, comments, streak
    const enriched = await Promise.all(posts.map(async (post) => {
      const [likes, comments, userLikes, streakRec] = await Promise.all([
        pb.collection('streak_likes').getFullList({ filter: `post = "${post.id}"` }),
        pb.collection('streak_comments').getFullList({ filter: `post = "${post.id}"` }),
        pb.collection('streak_likes').getFullList({ filter: `post = "${post.id}" && user = "${userId}"` }),
        pb.collection('user_streaks').getFullList({ filter: `user = "${post.user_id || (typeof post.user === 'string' ? post.user : post.user?.id)}"` }),
      ])
      return {
        ...mapStreakPost(post),
        like_count: likes.length,
        comment_count: comments.length,
        user_has_liked: userLikes.length > 0,
        poster_streak: streakRec.length > 0 ? streakRec[0].current_streak : 0,
      } as FeedPost
    }))

    return handleResult<FeedPost[]>(enriched)
  } catch (e) { return handleResult<FeedPost[]>(null, pbError(e)) }
}

export async function getUserStreakStats(userId: string) {
  try {
    const records = await pb.collection('user_streaks').getFullList({ filter: `user = "${userId}"` })
    if (records.length === 0) {
      // Create default streak record
      const record = await pb.collection('user_streaks').create({
        user: userId, current_streak: 0, longest_streak: 0, freeze_available: 1,
        freezes_used: 0, today_posted: false,
      })
      return handleResult<DbUserStreak>(mapUserStreak(record))
    }
    return handleResult<DbUserStreak>(mapUserStreak(records[0]))
  } catch (e) { return handleResult<DbUserStreak>(null, pbError(e)) }
}

export async function getTotalStreakPostCount(userId: string) {
  try {
    const records = await pb.collection('streak_posts').getFullList({ filter: `user = "${userId}"` })
    return { count: records.length, error: null }
  } catch (e) { return { count: 0, error: pbError(e) } }
}

export async function createStreakPost(userId: string, post: { media_url: string; media_type?: string; caption?: string; filter_name?: string; music_track?: string; location?: string }) {
  try {
    // Get current streak
    const streaks = await pb.collection('user_streaks').getFullList({ filter: `user = "${userId}"` })
    let streakDay = 1
    let currentStreak = 0
    let longestStreak = 0

    if (streaks.length > 0) {
      const s = streaks[0]
      const today = new Date().toISOString().split('T')[0]
      const lastPost = s.last_post_date ? new Date(s.last_post_date).toISOString().split('T')[0] : null

      if (lastPost === today) {
        // Already posted today
        streakDay = s.current_streak
        currentStreak = s.current_streak
        longestStreak = s.longest_streak
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (lastPost === yesterday) {
          currentStreak = s.current_streak + 1
        } else {
          currentStreak = 1
        }
        longestStreak = Math.max(s.longest_streak, currentStreak)
        streakDay = currentStreak

        await pb.collection('user_streaks').update(s.id, {
          current_streak: currentStreak, longest_streak: longestStreak,
          last_post_date: new Date().toISOString(), today_posted: true,
        })
      }
    } else {
      // First post ever
      await pb.collection('user_streaks').create({
        user: userId, current_streak: 1, longest_streak: 1,
        last_post_date: new Date().toISOString(), freeze_available: 1,
        freezes_used: 0, today_posted: true,
      })
      currentStreak = 1
      longestStreak = 1
    }

    const record = await pb.collection('streak_posts').create({
      user: userId, media_url: post.media_url, media_type: post.media_type || 'image',
      caption: post.caption || '', filter_name: post.filter_name || null,
      music_track: post.music_track || null, location: post.location || null,
      streak_day: streakDay,
    })

    // Check milestones
    await checkMilestones(userId, currentStreak)

    return handleResult<DbStreakPost>(mapStreakPost(record))
  } catch (e) { return handleResult<DbStreakPost>(null, pbError(e)) }
}

async function checkMilestones(userId: string, currentStreak: number) {
  const milestones = [3, 7, 14, 30, 50, 100, 200, 365]
  for (const days of milestones) {
    if (currentStreak >= days) {
      try {
        await pb.collection('streak_achievements').create({
          user: userId, achievement_type: `streak_${days}`,
          title: `${days}-Day Streak!`, description: `Maintained a ${days}-day streak`,
          icon: 'local_fire_department', unlocked_at: new Date().toISOString(),
        })
      } catch {
        // Already exists (unique constraint)
      }
    }
  }
}

export async function deleteStreakPost(postId: string) {
  try { await pb.collection('streak_posts').delete(postId); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── Streak Likes ──
export async function likeStreakPost(postId: string, userId: string) {
  try {
    const existing = await pb.collection('streak_likes').getFullList({
      filter: `post = "${postId}" && user = "${userId}"`,
    })
    if (existing.length > 0) return handleResult<void>(null)
    await pb.collection('streak_likes').create({ post: postId, user: userId })
    // Notify post owner (skip self-likes)
    try {
      const posts = await pb.collection('streak_posts').getFullList({ filter: `id = "${postId}"`, limit: 1 })
      if (posts.length > 0) {
        const postOwner = typeof posts[0].user === 'string' ? posts[0].user : posts[0].user?.id
        if (postOwner && postOwner !== userId) {
          const likerProfile = await pb.collection('profiles').getFullList({ filter: `user = "${userId}"`, limit: 1 })
          const name = likerProfile.length > 0 ? (likerProfile[0].full_name || 'Someone') : 'Someone'
          await notify(postOwner, 'like', 'New like', `${name} liked your post`, `/streaks`, userId)
        }
      }
    } catch { /* best-effort */ }
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

export async function unlikeStreakPost(postId: string, userId: string) {
  try {
    const existing = await pb.collection('streak_likes').getFullList({
      filter: `post = "${postId}" && user = "${userId}"`,
    })
    if (existing.length > 0) await pb.collection('streak_likes').delete(existing[0].id)
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── Streak Comments ──
export interface DbStreakComment {
  id: string; post_id: string; user_id: string; content: string; created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null
}

export async function getStreakComments(postId: string) {
  try {
    const records = await pb.collection('streak_comments').getFullList({
      filter: `post = "${postId}"`, sort: 'created', expand: 'user',
    })
    const comments = records.map(r => {
      const expand = r.expand || {}
      const userRecord = expand.user
      let profiles = null
      if (userRecord) {
        profiles = { full_name: userRecord.name || userRecord.username || null, avatar_url: null }
      }
      return {
        id: r.id, post_id: typeof r.post === 'string' ? r.post : r.post?.id || '',
        user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
        content: r.content, created_at: r.created || new Date().toISOString(),
        profiles,
      } as DbStreakComment
    })
    return handleResult<DbStreakComment[]>(comments)
  } catch (e) { return handleResult<DbStreakComment[]>(null, pbError(e)) }
}

export async function addStreakComment(postId: string, userId: string, content: string) {
  try {
    const record = await pb.collection('streak_comments').create({ post: postId, user: userId, content })
    // Notify post owner (skip self-comments)
    try {
      const posts = await pb.collection('streak_posts').getFullList({ filter: `id = "${postId}"`, limit: 1 })
      if (posts.length > 0) {
        const postOwner = typeof posts[0].user === 'string' ? posts[0].user : posts[0].user?.id
        if (postOwner && postOwner !== userId) {
          const commenterProfile = await pb.collection('profiles').getFullList({ filter: `user = "${userId}"`, limit: 1 })
          const name = commenterProfile.length > 0 ? (commenterProfile[0].full_name || 'Someone') : 'Someone'
          await notify(postOwner, 'comment', 'New comment', `${name} commented: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`, `/streaks`, userId)
        }
      }
    } catch { /* best-effort */ }
    return handleResult<DbStreakComment>({
      id: record.id, post_id: postId, user_id: userId, content,
      created_at: record.created || new Date().toISOString(), profiles: null,
    })
  } catch (e) { return handleResult<DbStreakComment>(null, pbError(e)) }
}

export async function deleteStreakComment(commentId: string) {
  try { await pb.collection('streak_comments').delete(commentId); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── User Streaks ──
export interface DbUserStreak {
  id: string; user_id: string; current_streak: number; longest_streak: number; last_post_date: string | null;
  freeze_available: number; freezes_used: number; last_freeze_used_at: string | null; streak_started_at: string | null; today_posted: boolean
}

function mapUserStreak(r: RecordModel): DbUserStreak {
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    current_streak: r.current_streak || 0, longest_streak: r.longest_streak || 0,
    last_post_date: r.last_post_date || null, freeze_available: r.freeze_available || 0,
    freezes_used: r.freezes_used || 0, last_freeze_used_at: r.last_freeze_used_at || null,
    streak_started_at: r.streak_started_at || null, today_posted: r.today_posted || false,
  }
}

// ── Streak Freeze ──
export async function useStreakFreeze(userId: string) {
  try {
    const streaks = await pb.collection('user_streaks').getFullList({ filter: `user = "${userId}"` })
    if (streaks.length === 0) return handleResult<any>(null, { message: 'No streak found' })

    const s = streaks[0]
    if (s.freeze_available <= 0) return handleResult<any>(null, { message: 'No freeze tokens available' })

    const today = new Date().toISOString().split('T')[0]
    const lastPost = s.last_post_date ? new Date(s.last_post_date).toISOString().split('T')[0] : null

    if (lastPost === today) return handleResult<any>(null, { message: 'Already posted today, no freeze needed' })

    // Use freeze
    await pb.collection('user_streaks').update(s.id, {
      freeze_available: s.freeze_available - 1,
      freezes_used: s.freezes_used + 1,
      last_freeze_used_at: new Date().toISOString(),
      last_post_date: new Date().toISOString(),
    })

    await pb.collection('streak_freezes').create({
      user: userId, streak_at_freeze: s.current_streak, reason: 'manual',
    })

    return handleResult<any>({ success: true })
  } catch (e) { return handleResult<any>(null, pbError(e)) }
}

// ── Streak Calendar ──
export async function getStreakCalendarDays(userId: string) {
  try {
    const records = await pb.collection('streak_posts').getFullList({
      filter: `user = "${userId}"`, sort: '-created', fields: 'created',
    })
    const days = records.map(r => new Date(r.created).toISOString().split('T')[0])
    return handleResult<string[]>([...new Set(days)])
  } catch (e) { return handleResult<string[]>(null, pbError(e)) }
}

// ── Friends ──
async function getFriendIds(userId: string): Promise<string[]> {
  try {
    const sent = await pb.collection('friend_requests').getFullList({
      filter: `sender = "${userId}" && status = "accepted"`,
    })
    const received = await pb.collection('friend_requests').getFullList({
      filter: `receiver = "${userId}" && status = "accepted"`,
    })
    const friendIds = [
      ...sent.map(r => typeof r.receiver === 'string' ? r.receiver : r.receiver?.id),
      ...received.map(r => typeof r.sender === 'string' ? r.sender : r.sender?.id),
    ].filter(Boolean) as string[]
    return [...new Set(friendIds)]
  } catch { return [] }
}

export interface DbFriend {
  id: string
  user_id: string
  friend_id: string
  full_name: string
  avatar_url: string | null
  email: string
  friends_since: string
}

export async function getFriends(userId: string) {
  try {
    const friendIds = await getFriendIds(userId)
    if (friendIds.length === 0) return handleResult<DbFriend[]>([])
    // Get profiles for friends
    const friends = await Promise.all(friendIds.map(async (id) => {
      try {
        const profiles = await pb.collection('profiles').getFullList({ filter: `user = "${id}"` })
        if (profiles.length > 0) {
          const p = profiles[0]
          // Find the friend_requests record to get the created date
          const reqs = await pb.collection('friend_requests').getFullList({
            filter: `((sender = "${userId}" && receiver = "${id}") || (sender = "${id}" && receiver = "${userId}")) && status = "accepted"`,
            sort: '-created',
            limit: 1,
          })
          return { id: p.id, user_id: id, friend_id: id, full_name: p.full_name || 'Unknown', avatar_url: p.avatar_url || null, email: p.email || '', friends_since: reqs.length > 0 ? reqs[0].created : new Date().toISOString() }
        }
        return { id, user_id: id, friend_id: id, full_name: 'Unknown', avatar_url: null, email: '', friends_since: new Date().toISOString() }
      } catch { return { id, user_id: id, friend_id: id, full_name: 'Unknown', avatar_url: null, email: '', friends_since: new Date().toISOString() } }
    }))
    return handleResult<DbFriend[]>(friends)
  } catch (e) { return handleResult<DbFriend[]>(null, pbError(e)) }
}

export async function sendFriendRequest(receiverId: string) {
  const senderId = getCurrentUserId()
  if (!senderId) return { data: null, error: 'Not authenticated' }
  try {
    // Check if already friends or request exists
    const existing = await pb.collection('friend_requests').getFullList({
      filter: `(sender = "${senderId}" && receiver = "${receiverId}") || (sender = "${receiverId}" && receiver = "${senderId}")`,
    })
    if (existing.length > 0) {
      const existingStatus = existing[0].status
      if (existingStatus === 'accepted') return { data: { success: true, action: 'already_friends' }, error: null }
      return { data: { success: true, action: 'pending' }, error: null }
    }

    // Check if the other user already sent us a request — if so, auto-accept
    const theirs = existing.find(r => typeof r.sender === 'string' ? r.sender === receiverId : r.sender?.id === receiverId)
    if (theirs) {
      await pb.collection('friend_requests').update(theirs.id, { status: 'accepted' })
      return { data: { success: true, action: 'auto_accepted' }, error: null }
    }

    await pb.collection('friend_requests').create({ sender: senderId, receiver: receiverId, status: 'pending' })
    // Notify receiver
    const senderProfile = await pb.collection('profiles').getFullList({ filter: `user = "${senderId}"`, limit: 1 })
    const senderName = senderProfile.length > 0 ? (senderProfile[0].full_name || 'Someone') : 'Someone'
    await notify(receiverId, 'friend_request', 'Friend request', `${senderName} sent you a friend request`, '/streaks', senderId)
    return { data: { success: true, action: 'sent' }, error: null }
  } catch (e) { return { data: null, error: pbError(e) } }
}

export async function respondFriendRequest(requestId: string, accept: boolean) {
  try {
    const request = await pb.collection('friend_requests').getFullList({ filter: `id = "${requestId}"`, limit: 1 })
    await pb.collection('friend_requests').update(requestId, { status: accept ? 'accepted' : 'rejected' })
    // Notify sender if accepted
    if (accept && request.length > 0) {
      const senderId = typeof request[0].sender === 'string' ? request[0].sender : request[0].sender?.id
      const receiverId = typeof request[0].receiver === 'string' ? request[0].receiver : request[0].receiver?.id
      if (senderId && receiverId) {
        const receiverProfile = await pb.collection('profiles').getFullList({ filter: `user = "${receiverId}"`, limit: 1 })
        const name = receiverProfile.length > 0 ? (receiverProfile[0].full_name || 'Someone') : 'Someone'
        await notify(senderId, 'friend_accept', 'Friend request accepted', `${name} accepted your friend request`, '/streaks', receiverId)
      }
    }
    return handleResult<any>({ success: true })
  } catch (e) { return handleResult<any>(null, pbError(e)) }
}

export async function removeFriend(friendId: string) {
  const userId = getCurrentUserId()
  if (!userId) return { data: null, error: 'Not authenticated' }
  try {
    const existing = await pb.collection('friend_requests').getFullList({
      filter: `(sender = "${userId}" && receiver = "${friendId}") || (sender = "${friendId}" && receiver = "${userId}")`,
    })
    for (const r of existing) {
      await pb.collection('friend_requests').delete(r.id)
    }
    return handleResult<any>({ success: true })
  } catch (e) { return handleResult<any>(null, pbError(e)) }
}

export async function searchUsers(query: string) {
  const currentUserId = getCurrentUserId()
  try {
    const records = await pb.collection('profiles').getFullList({
      filter: currentUserId
        ? `(full_name ~ "${query}" || email ~ "${query}") && user != "${currentUserId}"`
        : `full_name ~ "${query}" || email ~ "${query}"`,
      limit: 20,
    })
    return handleResult<any[]>(records.map(p => ({
      id: p.id, user_id: p.user, full_name: p.full_name || 'Unknown',
      avatar_url: p.avatar_url || null, email: p.email || '',
    })))
  } catch (e) { return handleResult<any[]>(null, pbError(e)) }
}

export interface SuggestedUser {
  id: string
  user_id: string
  full_name: string
  avatar_url: string | null
  email: string
  university?: string
}

export async function getSuggestedUsers(limit: number = 10) {
  const userId = getCurrentUserId()
  try {
    const friendIds = userId ? await getFriendIds(userId) : []
    const allIds = userId ? [userId, ...friendIds] : []
    const records = await pb.collection('profiles').getFullList({
      limit,
      filter: allIds.length > 0 ? allIds.map(id => `user != "${id}"`).join(' && ') : '',
    })
    return handleResult<SuggestedUser[]>(records.map(p => ({
      id: p.id, user_id: p.user, full_name: p.full_name || 'Unknown',
      avatar_url: p.avatar_url || null, email: p.email || '',
      university: p.university || undefined,
    })))
  } catch (e) { return handleResult<SuggestedUser[]>(null, pbError(e)) }
}

export async function getPendingFriendRequests(userId: string) {
  try {
    const records = await pb.collection('friend_requests').getFullList({
      filter: `receiver = "${userId}" && status = "pending"`, expand: 'sender',
    })
    const requests = records.map(r => {
      const sender = r.expand?.sender
      return {
        id: r.id,
        sender: sender ? { id: sender.id, full_name: sender.name || sender.username || 'Unknown', avatar_url: null } : null,
        status: r.status,
        created_at: r.created || new Date().toISOString(),
      }
    })
    return handleResult<any[]>(requests)
  } catch (e) { return handleResult<any[]>(null, pbError(e)) }
}

export async function getSentFriendRequests(userId: string) {
  try {
    const records = await pb.collection('friend_requests').getFullList({
      filter: `sender = "${userId}" && status = "pending"`,
    })
    return handleResult<string[]>(records.map(r => typeof r.receiver === 'string' ? r.receiver : r.receiver?.id))
  } catch (e) { return handleResult<string[]>(null, pbError(e)) }
}

export async function areFriends(userId: string, otherId: string) {
  try {
    const records = await pb.collection('friend_requests').getFullList({
      filter: `((sender = "${userId}" && receiver = "${otherId}") || (sender = "${otherId}" && receiver = "${userId}")) && status = "accepted"`,
    })
    return handleResult<boolean>(records.length > 0)
  } catch (e) { return handleResult<boolean>(false, pbError(e)) }
}

export async function hasPendingRequest(userId: string, otherId: string) {
  try {
    const records = await pb.collection('friend_requests').getFullList({
      filter: `((sender = "${userId}" && receiver = "${otherId}") || (sender = "${otherId}" && receiver = "${userId}")) && status = "pending"`,
    })
    return handleResult<boolean>(records.length > 0)
  } catch (e) { return handleResult<boolean>(false, pbError(e)) }
}

// ── Notifications ──
export interface DbNotification {
  id: string; user_id: string; type: string; title: string; body: string; link: string | null; actor_id: string | null; read: boolean; created_at: string
}

async function notify(userId: string, type: string, title: string, body: string, link?: string, actorId?: string) {
  try {
    await pb.collection('notifications').create({
      user: userId, type, title, body,
      link: link || '', actor: actorId || '', read: false,
    })
  } catch { /* best-effort */ }
}

export async function getNotifications(userId: string, limit: number = 50) {
  try {
    const records = await pb.collection('notifications').getFullList({
      filter: `user = "${userId}"`, sort: '-created', limit,
    })
    return handleResult<DbNotification[]>(records.map(mapNotification))
  } catch (e) { return handleResult<DbNotification[]>(null, pbError(e)) }
}

export async function getUnreadCount(userId: string) {
  try {
    const records = await pb.collection('notifications').getFullList({
      filter: `user = "${userId}" && read = false`,
    })
    return { count: records.length, error: null }
  } catch (e) { return { count: 0, error: pbError(e) } }
}

export async function markNotificationRead(id: string) {
  try { await pb.collection('notifications').update(id, { read: true }); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, pbError(e)) }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    const records = await pb.collection('notifications').getFullList({ filter: `user = "${userId}" && read = false` })
    for (const r of records) await pb.collection('notifications').update(r.id, { read: true })
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

function mapNotification(r: RecordModel): DbNotification {
  return {
    id: r.id, user_id: typeof r.user === 'string' ? r.user : r.user?.id || '',
    type: r.type, title: r.title, body: r.body, link: r.link || null,
    actor_id: r.actor ? (typeof r.actor === 'string' ? r.actor : r.actor?.id) : null,
    read: r.read || false, created_at: r.created || new Date().toISOString(),
  }
}

// ── Push Subscriptions ──
export async function savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string) {
  try {
    // Upsert: check existing
    const existing = await pb.collection('push_subscriptions').getFullList({
      filter: `user = "${userId}" && endpoint = "${endpoint}"`,
    })
    if (existing.length > 0) {
      await pb.collection('push_subscriptions').update(existing[0].id, { p256dh, auth_key: auth })
    } else {
      await pb.collection('push_subscriptions').create({ user: userId, endpoint, p256dh, auth_key: auth })
    }
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

export async function removePushSubscription(userId: string, endpoint: string) {
  try {
    const existing = await pb.collection('push_subscriptions').getFullList({
      filter: `user = "${userId}" && endpoint = "${endpoint}"`,
    })
    for (const r of existing) await pb.collection('push_subscriptions').delete(r.id)
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── Profile ──
export interface DbProfile {
  id: string; user_id: string; full_name: string | null; email: string | null; avatar_url: string | null;
  university: string | null; course: string | null; year_of_study: string | null;
  created_at: string; updated_at: string
}

export async function getProfile(userId: string) {
  try {
    const records = await pb.collection('profiles').getFullList({ filter: `user = "${userId}"` })
    if (records.length === 0) return handleResult<DbProfile>(null)
    const r = records[0]
    return handleResult<DbProfile>({
      id: r.id, user_id: r.user, full_name: r.full_name || null, email: r.email || null,
      avatar_url: r.avatar_url || null, university: r.university || null, course: r.course || null,
      year_of_study: r.year_of_study || null,
      created_at: r.created || new Date().toISOString(), updated_at: r.updated || new Date().toISOString(),
    })
  } catch (e) { return handleResult<DbProfile>(null, pbError(e)) }
}

export async function upsertProfile(userId: string, data: Partial<DbProfile>) {
  try {
    const existing = await pb.collection('profiles').getFullList({ filter: `user = "${userId}"` })
    const profileData: any = {}
    if (data.full_name !== undefined) profileData.full_name = data.full_name
    if (data.email !== undefined) profileData.email = data.email
    if (data.avatar_url !== undefined) profileData.avatar_url = data.avatar_url
    if (data.university !== undefined) profileData.university = data.university
    if (data.course !== undefined) profileData.course = data.course
    if (data.year_of_study !== undefined) profileData.year_of_study = data.year_of_study

    if (existing.length > 0) {
      await pb.collection('profiles').update(existing[0].id, profileData)
    } else {
      profileData.user = userId
      if (!profileData.email) {
        try { profileData.email = pb.authStore.record?.email || '' } catch {}
      }
      await pb.collection('profiles').create(profileData)
    }
    return getProfile(userId)
  } catch (e) { return handleResult<DbProfile>(null, pbError(e)) }
}

// ── Feedback ──
export async function submitFeedback(userId: string | null, data: { name: string; email: string; message: string; rating?: number }) {
  try {
    await pb.collection('feedback').create({
      user: userId || null, ...data,
      user_agent: navigator.userAgent, url: window.location.href,
    })
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, pbError(e)) }
}

// ── Onboarding ──
export async function completeOnboarding(userId: string, data: { full_name: string; university: string; course: string; year_of_study: string }) {
  return upsertProfile(userId, data)
}

export async function isOnboarded(userId: string) {
  try {
    const records = await pb.collection('profiles').getFullList({ filter: `user = "${userId}" && university != "" && university != null` })
    return handleResult<boolean>(records.length > 0 && !!records[0].university)
  } catch (e) { return handleResult<boolean>(false, pbError(e)) }
}

// ── Dashboard Helpers ──
export async function getTodayTasks(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const records = await pb.collection('tasks').getFullList({
      filter: `user = "${userId}" && due_date = "${today}"`,
      sort: 'due_date',
    })
    return handleResult<DbTask[]>(records.map(mapTask))
  } catch (e) { return handleResult<DbTask[]>(null, pbError(e)) }
}

export async function getTodayHabits(userId: string) {
  return getHabits(userId)
}

// ── Adapter Functions (component compatibility) ──

// Notification adapters — components expect markAsRead/markAllAsRead returning { error }
export async function markAsRead(id: string) {
  try {
    await pb.collection('notifications').update(id, { read: true })
    return { error: null }
  } catch (e) { return { error: pbError(e) } }
}

export async function markAllAsRead(userId: string) {
  try {
    const records = await pb.collection('notifications').getFullList({
      filter: `user = "${userId}" && read = false`,
    })
    for (const r of records) await pb.collection('notifications').update(r.id, { read: true })
    return { error: null }
  } catch (e) { return { error: pbError(e) } }
}

// Streak calendar — components expect getStreakCalendar(userId, year, month) → { data: { posted_dates: string[] } }
export async function getStreakCalendar(userId: string, year: number, month: number) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    const records = await pb.collection('streak_posts').getFullList({
      filter: `user = "${userId}" && created >= "${startDate}" && created < "${endDate}"`,
      sort: 'created',
      fields: 'created',
    })
    const posted_dates = records.map(r => r.created as string)
    return { data: { posted_dates }, error: null }
  } catch (e) { return { data: { posted_dates: [] }, error: pbError(e) } }
}

// Friend request adapters
export interface DbFriendRequest {
  id: string
  sender: { id: string; full_name: string; avatar_url: string | null } | null
  status: string
  created_at: string
}

export async function getFriendRequests(userId: string) {
  try {
    const records = await pb.collection('friend_requests').getFullList({
      filter: `receiver = "${userId}" && status = "pending"`,
      expand: 'sender',
    })
    const requests: DbFriendRequest[] = records.map(r => {
      const sender = r.expand?.sender as RecordModel | undefined
      return {
        id: r.id,
        sender: sender ? {
          id: sender.id,
          full_name: (sender.full_name as string) || (sender.name as string) || 'Unknown',
          avatar_url: sender.avatar_url || null,
        } : null,
        status: r.status as string,
        created_at: (r.created as string) || new Date().toISOString(),
      }
    })
    return handleResult<DbFriendRequest[]>(requests)
  } catch (e) { return handleResult<DbFriendRequest[]>(null, pbError(e)) }
}

// getFriendRequestStatus — returns the status of a friend request between current user and target
export async function getFriendRequestStatus(targetUserId: string) {
  const currentUserId = getCurrentUserId()
  if (!currentUserId) return { data: null, error: 'Not authenticated' }
  try {
    const records = await pb.collection('friend_requests').getFullList({
      filter: `(sender = "${currentUserId}" && receiver = "${targetUserId}") || (sender = "${targetUserId}" && receiver = "${currentUserId}")`,
    })
    if (records.length === 0) return { data: { status: 'none' }, error: null }
    // Prioritize accepted, then pending, then declined
    const accepted = records.find(r => r.status === 'accepted')
    if (accepted) return { data: { status: 'accepted' }, error: null }
    const pending = records.find(r => r.status === 'pending')
    if (pending) return { data: { status: 'pending' }, error: null }
    return { data: { status: records[0].status as string }, error: null }
  } catch (e) { return { data: null, error: pbError(e) } }
}

