import { db, auth } from './firebase'
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit as firestoreLimit,
  writeBatch, getDoc
} from 'firebase/firestore'

// ── Helpers ──
function handleResult<T>(data: T | null, error?: any): { data: T | null; error: any } {
  return { data, error: error || null }
}

function fbError(e: any): { message: string } {
  return { message: e?.message || 'Unknown error' }
}

function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null
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
    const q = query(collection(db, 'tasks'), where('user', '==', userId), orderBy('due_date'))
    const snap = await getDocs(q)
    return handleResult<DbTask[]>(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
  } catch (e) { return handleResult<DbTask[]>(null, fbError(e)) }
}

export async function createTask(userId: string, task: { title: string; description?: string; due_date?: string; priority?: string }) {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'tasks'), {
      user: userId, title: task.title, description: task.description || '',
      due_date: task.due_date || null, priority: task.priority || 'medium', completed: false,
      created_at: now, updated_at: now,
    })
    return handleResult<DbTask>({ id: docRef.id, user_id: userId, title: task.title, description: task.description || null, due_date: task.due_date || null, priority: (task.priority as any) || 'medium', completed: false, created_at: now, updated_at: now })
  } catch (e) { return handleResult<DbTask>(null, fbError(e)) }
}

export async function updateTask(taskId: string, updates: Partial<DbTask>) {
  try {
    const data: any = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) data.title = updates.title
    if (updates.description !== undefined) data.description = updates.description
    if (updates.due_date !== undefined) data.due_date = updates.due_date
    if (updates.priority !== undefined) data.priority = updates.priority
    if (updates.completed !== undefined) data.completed = updates.completed
    await updateDoc(doc(db, 'tasks', taskId), data)
    const snap = await getDoc(doc(db, 'tasks', taskId))
    return handleResult<DbTask>(snap.exists() ? { id: snap.id, ...snap.data() } as any : null)
  } catch (e) { return handleResult<DbTask>(null, fbError(e)) }
}

export async function deleteTask(taskId: string, _userId: string) {
  try { await deleteDoc(doc(db, 'tasks', taskId)); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Habits ──
export interface DbHabit {
  id: string; user_id: string; name: string; category: string | null; icon: string; target_per_day: number; created_at: string
}
export interface DbHabitCompletion {
  id: string; habit_id: string; user_id: string; completed_date: string; created_at: string
}

export async function getHabits(userId: string) {
  try {
    const q = query(collection(db, 'habits'), where('user', '==', userId), orderBy('created_at', 'desc'))
    const snap = await getDocs(q)
    return handleResult<DbHabit[]>(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
  } catch (e) { return handleResult<DbHabit[]>(null, fbError(e)) }
}

export async function createHabit(userId: string, habit: { name: string; category?: string; icon?: string; target_per_day?: number }) {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'habits'), {
      user: userId, name: habit.name, category: habit.category || null,
      icon: habit.icon || 'check_circle', target_per_day: habit.target_per_day || 1,
      created_at: now,
    })
    return handleResult<DbHabit>({ id: docRef.id, user_id: userId, name: habit.name, category: habit.category || null, icon: habit.icon || 'check_circle', target_per_day: habit.target_per_day || 1, created_at: now })
  } catch (e) { return handleResult<DbHabit>(null, fbError(e)) }
}

export async function deleteHabit(habitId: string) {
  try { await deleteDoc(doc(db, 'habits', habitId)); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

export async function getHabitCompletions(userId: string, date?: string) {
  try {
    const today = date || new Date().toISOString().split('T')[0]
    const q = query(collection(db, 'habit_completions'), where('user', '==', userId), where('completed_date', '==', today))
    const snap = await getDocs(q)
    return handleResult<DbHabitCompletion[]>(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
  } catch (e) { return handleResult<DbHabitCompletion[]>(null, fbError(e)) }
}

export async function toggleHabitCompletion(userId: string, habitId: string, date: string) {
  try {
    const q = query(collection(db, 'habit_completions'), where('user', '==', userId), where('habit', '==', habitId), where('completed_date', '==', date))
    const snap = await getDocs(q)
    if (snap.docs.length > 0) {
      await deleteDoc(doc(db, 'habit_completions', snap.docs[0].id))
      return handleResult<{ completed: boolean }>({ completed: false })
    } else {
      await addDoc(collection(db, 'habit_completions'), { user: userId, habit: habitId, completed_date: date, created_at: new Date().toISOString() })
      return handleResult<{ completed: boolean }>({ completed: true })
    }
  } catch (e) { return handleResult<{ completed: boolean }>(null, fbError(e)) }
}

// ── Journal ──
export interface DbJournalEntry {
  id: string; user_id: string; title: string; content: string; mood: string | null; created_at: string; updated_at: string
}

export async function getJournalEntries(userId: string) {
  try {
    const q = query(collection(db, 'journal_entries'), where('user', '==', userId), orderBy('created_at', 'desc'))
    const snap = await getDocs(q)
    return handleResult<DbJournalEntry[]>(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
  } catch (e) { return handleResult<DbJournalEntry[]>(null, fbError(e)) }
}

export async function createJournalEntry(userId: string, entry: { title: string; content?: string; mood?: string }) {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'journal_entries'), {
      user: userId, title: entry.title, content: entry.content || '', mood: entry.mood || null,
      created_at: now, updated_at: now,
    })
    return handleResult<DbJournalEntry>({ id: docRef.id, user_id: userId, title: entry.title, content: entry.content || '', mood: entry.mood || null, created_at: now, updated_at: now })
  } catch (e) { return handleResult<DbJournalEntry>(null, fbError(e)) }
}

export async function deleteJournalEntry(entryId: string) {
  try { await deleteDoc(doc(db, 'journal_entries', entryId)); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Transactions ──
export interface DbTransaction {
  id: string; user_id: string; title: string; amount: number; type: 'income' | 'expense'; category: string; date: string; created_at: string
}

export async function getTransactions(userId: string) {
  try {
    const q = query(collection(db, 'transactions'), where('user', '==', userId), orderBy('created_at', 'desc'))
    const snap = await getDocs(q)
    return handleResult<DbTransaction[]>(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
  } catch (e) { return handleResult<DbTransaction[]>(null, fbError(e)) }
}

export async function createTransaction(userId: string, tx: { title: string; amount: number; type: string; category: string; date: string }) {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'transactions'), {
      user: userId, title: tx.title, amount: tx.amount, type: tx.type, category: tx.category, date: tx.date, created_at: now,
    })
    return handleResult<DbTransaction>({ id: docRef.id, user_id: userId, title: tx.title, amount: tx.amount, type: tx.type as any, category: tx.category, date: tx.date, created_at: now })
  } catch (e) { return handleResult<DbTransaction>(null, fbError(e)) }
}

export async function deleteTransaction(txId: string) {
  try { await deleteDoc(doc(db, 'transactions', txId)); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Assignments ──
export interface DbAssignment {
  id: string; user_id: string; title: string; description: string | null; due_date: string | null; priority: 'high' | 'medium' | 'low'; completed: boolean; created_at: string; updated_at: string
}

export async function getAssignments(userId: string) {
  try {
    const q = query(collection(db, 'assignments'), where('user', '==', userId), orderBy('due_date'))
    const snap = await getDocs(q)
    return handleResult<DbAssignment[]>(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
  } catch (e) { return handleResult<DbAssignment[]>(null, fbError(e)) }
}

export async function createAssignment(userId: string, a: { title: string; description?: string; due_date?: string; priority?: string }) {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'assignments'), {
      user: userId, title: a.title, description: a.description || '', due_date: a.due_date || null,
      priority: a.priority || 'medium', completed: false, created_at: now, updated_at: now,
    })
    return handleResult<DbAssignment>({ id: docRef.id, user_id: userId, title: a.title, description: a.description || null, due_date: a.due_date || null, priority: (a.priority as any) || 'medium', completed: false, created_at: now, updated_at: now })
  } catch (e) { return handleResult<DbAssignment>(null, fbError(e)) }
}

export async function updateAssignment(id: string, updates: Partial<DbAssignment>) {
  try {
    const data: any = { updated_at: new Date().toISOString() }
    if (updates.title !== undefined) data.title = updates.title
    if (updates.description !== undefined) data.description = updates.description
    if (updates.due_date !== undefined) data.due_date = updates.due_date
    if (updates.priority !== undefined) data.priority = updates.priority
    if (updates.completed !== undefined) data.completed = updates.completed
    await updateDoc(doc(db, 'assignments', id), data)
    const snap = await getDoc(doc(db, 'assignments', id))
    return handleResult<DbAssignment>(snap.exists() ? { id: snap.id, ...snap.data() } as any : null)
  } catch (e) { return handleResult<DbAssignment>(null, fbError(e)) }
}

export async function deleteAssignment(id: string) {
  try { await deleteDoc(doc(db, 'assignments', id)); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Streak Posts ──
export interface DbStreakPost {
  id: string; user_id: string; media_url: string; media_type: 'image' | 'video'; caption: string | null;
  filter_name: string | null; music_track: string | null; location: string | null; streak_day: number | null;
  created_at: string; profiles?: { full_name: string | null; avatar_url: string | null } | null
}

export type FeedPost = DbStreakPost & { like_count: number; comment_count: number; user_has_liked: boolean; poster_streak?: number }

async function getUserProfile(userId: string): Promise<{ full_name: string | null; avatar_url: string | null } | null> {
  try {
    const q = query(collection(db, 'profiles'), where('user', '==', userId), firestoreLimit(1))
    const snap = await getDocs(q)
    if (snap.docs.length > 0) {
      const d = snap.docs[0].data()
      return { full_name: d.full_name || null, avatar_url: d.avatar_url || null }
    }
    return null
  } catch { return null }
}

export async function getStreakFeed(userId: string) {
  try {
    const friendIds = await getFriendIds(userId)
    const allIds = [userId, ...friendIds]
    if (allIds.length === 0) return handleResult<FeedPost[]>([])

    // Firestore 'in' query supports max 30 items
    const posts: any[] = []
    for (let i = 0; i < allIds.length; i += 30) {
      const batch = allIds.slice(i, i + 30)
      const q = query(collection(db, 'streak_posts'), where('user', 'in', batch), orderBy('created_at', 'desc'))
      const snap = await getDocs(q)
      posts.push(...snap.docs)
    }

    const enriched = await Promise.all(posts.map(async (postDoc) => {
      const postData = postDoc.data()
      const postId = postDoc.id
      const posterId = postData.user

      const [likesSnap, commentsSnap, userLikesSnap, streakSnap, profile] = await Promise.all([
        getDocs(query(collection(db, 'streak_likes'), where('post', '==', postId))),
        getDocs(query(collection(db, 'streak_comments'), where('post', '==', postId))),
        getDocs(query(collection(db, 'streak_likes'), where('post', '==', postId), where('user', '==', userId))),
        getDocs(query(collection(db, 'user_streaks'), where('user', '==', posterId), firestoreLimit(1))),
        getUserProfile(posterId),
      ])

      return {
        id: postId,
        user_id: posterId,
        media_url: postData.media_url,
        media_type: postData.media_type || 'image',
        caption: postData.caption || null,
        filter_name: postData.filter_name || null,
        music_track: postData.music_track || null,
        location: postData.location || null,
        streak_day: postData.streak_day || null,
        created_at: postData.created_at || new Date().toISOString(),
        profiles: profile,
        like_count: likesSnap.size,
        comment_count: commentsSnap.size,
        user_has_liked: !userLikesSnap.empty,
        poster_streak: !streakSnap.empty ? streakSnap.docs[0].data().current_streak : 0,
      } as FeedPost
    }))

    return handleResult<FeedPost[]>(enriched)
  } catch (e) { return handleResult<FeedPost[]>(null, fbError(e)) }
}

export async function getUserStreakStats(userId: string) {
  try {
    const q = query(collection(db, 'user_streaks'), where('user', '==', userId), firestoreLimit(1))
    const snap = await getDocs(q)
    if (snap.empty) {
      const docRef = await addDoc(collection(db, 'user_streaks'), {
        user: userId, current_streak: 0, longest_streak: 0, freeze_available: 1,
        freezes_used: 0, today_posted: false, last_post_date: null, last_freeze_used_at: null, streak_started_at: null,
      })
      return handleResult<DbUserStreak>({ id: docRef.id, user_id: userId, current_streak: 0, longest_streak: 0, last_post_date: null, freeze_available: 1, freezes_used: 0, last_freeze_used_at: null, streak_started_at: null, today_posted: false })
    }
    const d = snap.docs[0]
    return handleResult<DbUserStreak>({ id: d.id, ...d.data() } as any)
  } catch (e) { return handleResult<DbUserStreak>(null, fbError(e)) }
}

export async function getTotalStreakPostCount(userId: string) {
  try {
    const q = query(collection(db, 'streak_posts'), where('user', '==', userId))
    const snap = await getDocs(q)
    return { count: snap.size, error: null }
  } catch (e) { return { count: 0, error: fbError(e) } }
}

export async function createStreakPost(userId: string, post: { media_url: string; media_type?: string; caption?: string; filter_name?: string; music_track?: string; location?: string }) {
  try {
    const streaks = await getDocs(query(collection(db, 'user_streaks'), where('user', '==', userId), firestoreLimit(1)))
    let streakDay = 1
    let currentStreak = 0
    let longestStreak = 0

    if (!streaks.empty) {
      const s = streaks.docs[0]
      const sData = s.data()
      const today = new Date().toISOString().split('T')[0]
      const lastPost = sData.last_post_date ? new Date(sData.last_post_date).toISOString().split('T')[0] : null

      if (lastPost === today) {
        streakDay = sData.current_streak
        currentStreak = sData.current_streak
        longestStreak = sData.longest_streak
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        currentStreak = lastPost === yesterday ? sData.current_streak + 1 : 1
        longestStreak = Math.max(sData.longest_streak, currentStreak)
        streakDay = currentStreak
        await updateDoc(doc(db, 'user_streaks', s.id), {
          current_streak: currentStreak, longest_streak: longestStreak,
          last_post_date: new Date().toISOString(), today_posted: true,
        })
      }
    } else {
      await addDoc(collection(db, 'user_streaks'), {
        user: userId, current_streak: 1, longest_streak: 1,
        last_post_date: new Date().toISOString(), freeze_available: 1,
        freezes_used: 0, today_posted: true, last_freeze_used_at: null, streak_started_at: null,
      })
      currentStreak = 1
      longestStreak = 1
    }

    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'streak_posts'), {
      user: userId, media_url: post.media_url, media_type: post.media_type || 'image',
      caption: post.caption || '', filter_name: post.filter_name || null,
      music_track: post.music_track || null, location: post.location || null,
      streak_day: streakDay, created_at: now,
    })

    await checkMilestones(userId, currentStreak)

    return handleResult<DbStreakPost>({ id: docRef.id, user_id: userId, media_url: post.media_url, media_type: (post.media_type as any) || 'image', caption: post.caption || null, filter_name: post.filter_name || null, music_track: post.music_track || null, location: post.location || null, streak_day: streakDay, created_at: now, profiles: null })
  } catch (e) { return handleResult<DbStreakPost>(null, fbError(e)) }
}

async function checkMilestones(userId: string, currentStreak: number) {
  const milestones = [3, 7, 14, 30, 50, 100, 200, 365]
  for (const days of milestones) {
    if (currentStreak >= days) {
      try {
        const existing = await getDocs(query(collection(db, 'streak_achievements'), where('user', '==', userId), where('achievement_type', '==', `streak_${days}`), firestoreLimit(1)))
        if (existing.empty) {
          await addDoc(collection(db, 'streak_achievements'), {
            user: userId, achievement_type: `streak_${days}`,
            title: `${days}-Day Streak!`, description: `Maintained a ${days}-day streak`,
            icon: 'local_fire_department', unlocked_at: new Date().toISOString(),
          })
        }
      } catch { /* already exists */ }
    }
  }
}

export async function deleteStreakPost(postId: string) {
  try { await deleteDoc(doc(db, 'streak_posts', postId)); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Streak Likes ──
export async function likeStreakPost(postId: string, userId: string) {
  try {
    const existing = await getDocs(query(collection(db, 'streak_likes'), where('post', '==', postId), where('user', '==', userId)))
    if (!existing.empty) return handleResult<void>(null)
    await addDoc(collection(db, 'streak_likes'), { post: postId, user: userId, created_at: new Date().toISOString() })
    try {
      const postSnap = await getDocs(query(collection(db, 'streak_posts'), where('__name__', '==', postId), firestoreLimit(1)))
      if (!postSnap.empty) {
        const postOwner = postSnap.docs[0].data().user
        if (postOwner && postOwner !== userId) {
          const name = (await getUserProfile(userId))?.full_name || 'Someone'
          await notify(postOwner, 'like', 'New like', `${name} liked your post`, '/streaks', userId)
        }
      }
    } catch { /* best-effort */ }
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, fbError(e)) }
}

export async function unlikeStreakPost(postId: string, userId: string) {
  try {
    const existing = await getDocs(query(collection(db, 'streak_likes'), where('post', '==', postId), where('user', '==', userId)))
    if (!existing.empty) await deleteDoc(doc(db, 'streak_likes', existing.docs[0].id))
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Streak Comments ──
export interface DbStreakComment {
  id: string; post_id: string; user_id: string; content: string; created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null
}

export async function getStreakComments(postId: string) {
  try {
    const q = query(collection(db, 'streak_comments'), where('post', '==', postId), orderBy('created_at'))
    const snap = await getDocs(q)
    const comments = await Promise.all(snap.docs.map(async (d) => {
      const data = d.data()
      const profile = await getUserProfile(data.user)
      return {
        id: d.id, post_id: data.post, user_id: data.user, content: data.content,
        created_at: data.created_at || new Date().toISOString(), profiles: profile,
      } as DbStreakComment
    }))
    return handleResult<DbStreakComment[]>(comments)
  } catch (e) { return handleResult<DbStreakComment[]>(null, fbError(e)) }
}

export async function addStreakComment(postId: string, userId: string, content: string) {
  try {
    const now = new Date().toISOString()
    const docRef = await addDoc(collection(db, 'streak_comments'), { post: postId, user: userId, content, created_at: now })
    try {
      const postSnap = await getDocs(query(collection(db, 'streak_posts'), where('__name__', '==', postId), firestoreLimit(1)))
      if (!postSnap.empty) {
        const postOwner = postSnap.docs[0].data().user
        if (postOwner && postOwner !== userId) {
          const name = (await getUserProfile(userId))?.full_name || 'Someone'
          await notify(postOwner, 'comment', 'New comment', `${name} commented: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`, '/streaks', userId)
        }
      }
    } catch { /* best-effort */ }
    return handleResult<DbStreakComment>({
      id: docRef.id, post_id: postId, user_id: userId, content,
      created_at: now, profiles: null,
    })
  } catch (e) { return handleResult<DbStreakComment>(null, fbError(e)) }
}

export async function deleteStreakComment(commentId: string) {
  try { await deleteDoc(doc(db, 'streak_comments', commentId)); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── User Streaks ──
export interface DbUserStreak {
  id: string; user_id: string; current_streak: number; longest_streak: number; last_post_date: string | null;
  freeze_available: number; freezes_used: number; last_freeze_used_at: string | null; streak_started_at: string | null; today_posted: boolean
}

// ── Streak Freeze ──
export async function useStreakFreeze(userId: string) {
  try {
    const streaks = await getDocs(query(collection(db, 'user_streaks'), where('user', '==', userId), firestoreLimit(1)))
    if (streaks.empty) return handleResult<any>(null, { message: 'No streak found' })

    const sDoc = streaks.docs[0]
    const s = sDoc.data()
    if (s.freeze_available <= 0) return handleResult<any>(null, { message: 'No freeze tokens available' })

    const today = new Date().toISOString().split('T')[0]
    const lastPost = s.last_post_date ? new Date(s.last_post_date).toISOString().split('T')[0] : null
    if (lastPost === today) return handleResult<any>(null, { message: 'Already posted today, no freeze needed' })

    await updateDoc(doc(db, 'user_streaks', sDoc.id), {
      freeze_available: s.freeze_available - 1,
      freezes_used: s.freezes_used + 1,
      last_freeze_used_at: new Date().toISOString(),
      last_post_date: new Date().toISOString(),
    })

    await addDoc(collection(db, 'streak_freezes'), {
      user: userId, streak_at_freeze: s.current_streak, reason: 'manual', created_at: new Date().toISOString(),
    })

    return handleResult<any>({ success: true })
  } catch (e) { return handleResult<any>(null, fbError(e)) }
}

// ── Streak Calendar ──
export async function getStreakCalendarDays(userId: string) {
  try {
    const q = query(collection(db, 'streak_posts'), where('user', '==', userId), orderBy('created_at', 'desc'))
    const snap = await getDocs(q)
    const days = snap.docs.map(d => new Date(d.data().created_at).toISOString().split('T')[0])
    return handleResult<string[]>([...new Set(days)])
  } catch (e) { return handleResult<string[]>(null, fbError(e)) }
}

// ── Friends ──
async function getFriendIds(userId: string): Promise<string[]> {
  try {
    const sentSnap = await getDocs(query(collection(db, 'friend_requests'), where('sender', '==', userId), where('status', '==', 'accepted')))
    const receivedSnap = await getDocs(query(collection(db, 'friend_requests'), where('receiver', '==', userId), where('status', '==', 'accepted')))
    const friendIds = [
      ...sentSnap.docs.map(d => d.data().receiver),
      ...receivedSnap.docs.map(d => d.data().sender),
    ].filter(Boolean)
    return [...new Set(friendIds)]
  } catch { return [] }
}

export interface DbFriend {
  id: string; user_id: string; friend_id: string; full_name: string; avatar_url: string | null; email: string; friends_since: string
}

export async function getFriends(userId: string) {
  try {
    const friendIds = await getFriendIds(userId)
    if (friendIds.length === 0) return handleResult<DbFriend[]>([])
    const friends = await Promise.all(friendIds.map(async (id) => {
      const profile = await getUserProfile(id)
      const reqSnap = await getDocs(query(collection(db, 'friend_requests'),
        where('sender', 'in', [userId, id]), where('receiver', 'in', [userId, id]), where('status', '==', 'accepted'),
        orderBy('created_at', 'desc'), firestoreLimit(1)))
      return {
        id, user_id: id, friend_id: id,
        full_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        email: '', friends_since: !reqSnap.empty ? reqSnap.docs[0].data().created_at : new Date().toISOString(),
      }
    }))
    return handleResult<DbFriend[]>(friends)
  } catch (e) { return handleResult<DbFriend[]>(null, fbError(e)) }
}

export async function sendFriendRequest(receiverId: string) {
  const senderId = getCurrentUserId()
  if (!senderId) return { data: null, error: 'Not authenticated' }
  try {
    const existingSnap = await getDocs(query(collection(db, 'friend_requests'),
      where('sender', 'in', [senderId, receiverId]), where('receiver', 'in', [senderId, receiverId])))
    if (!existingSnap.empty) {
      const existingStatus = existingSnap.docs[0].data().status
      if (existingStatus === 'accepted') return { data: { success: true, action: 'already_friends' }, error: null }
      return { data: { success: true, action: 'pending' }, error: null }
    }

    const theirs = existingSnap.docs.find(d => d.data().sender === receiverId)
    if (theirs) {
      await updateDoc(doc(db, 'friend_requests', theirs.id), { status: 'accepted' })
      return { data: { success: true, action: 'auto_accepted' }, error: null }
    }

    await addDoc(collection(db, 'friend_requests'), { sender: senderId, receiver: receiverId, status: 'pending', created_at: new Date().toISOString() })
    const name = (await getUserProfile(senderId))?.full_name || 'Someone'
    await notify(receiverId, 'friend_request', 'Friend request', `${name} sent you a friend request`, '/streaks', senderId)
    return { data: { success: true, action: 'sent' }, error: null }
  } catch (e) { return { data: null, error: fbError(e) } }
}

export async function respondFriendRequest(requestId: string, accept: boolean) {
  try {
    const reqSnap = await getDocs(query(collection(db, 'friend_requests'), where('__name__', '==', requestId), firestoreLimit(1)))
    await updateDoc(doc(db, 'friend_requests', requestId), { status: accept ? 'accepted' : 'rejected' })
    if (accept && !reqSnap.empty) {
      const req = reqSnap.docs[0].data()
      const name = (await getUserProfile(req.receiver))?.full_name || 'Someone'
      await notify(req.sender, 'friend_accept', 'Friend request accepted', `${name} accepted your friend request`, '/streaks', req.receiver)
    }
    return handleResult<any>({ success: true })
  } catch (e) { return handleResult<any>(null, fbError(e)) }
}

export async function removeFriend(friendId: string) {
  const userId = getCurrentUserId()
  if (!userId) return { data: null, error: 'Not authenticated' }
  try {
    const existingSnap = await getDocs(query(collection(db, 'friend_requests'),
      where('sender', 'in', [userId, friendId]), where('receiver', 'in', [userId, friendId])))
    const batch = writeBatch(db)
    existingSnap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
    return handleResult<any>({ success: true })
  } catch (e) { return handleResult<any>(null, fbError(e)) }
}

export async function searchUsers(queryStr: string) {
  const currentUserId = getCurrentUserId()
  try {
    const q = query(collection(db, 'profiles'), orderBy('full_name'), firestoreLimit(20))
    const snap = await getDocs(q)
    const results = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter((p: any) => {
        const nameMatch = (p.full_name || '').toLowerCase().includes(queryStr.toLowerCase())
        const emailMatch = (p.email || '').toLowerCase().includes(queryStr.toLowerCase())
        return (nameMatch || emailMatch) && p.user !== currentUserId
      })
    return handleResult<any[]>(results.map(p => ({
      id: p.id, user_id: p.user, full_name: p.full_name || 'Unknown',
      avatar_url: p.avatar_url || null, email: p.email || '',
    })))
  } catch (e) { return handleResult<any[]>(null, fbError(e)) }
}

export interface SuggestedUser {
  id: string; user_id: string; full_name: string; avatar_url: string | null; email: string; university?: string
}

export async function getSuggestedUsers(limitCount: number = 10) {
  const userId = getCurrentUserId()
  try {
    const friendIds = userId ? await getFriendIds(userId) : []
    const allIds = userId ? [userId, ...friendIds] : []
    const snap = await getDocs(query(collection(db, 'profiles'), firestoreLimit(limitCount + allIds.length)))
    const results = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter((p: any) => allIds.length === 0 || !allIds.includes(p.user))
      .slice(0, limitCount)
    return handleResult<SuggestedUser[]>(results.map(p => ({
      id: p.id, user_id: p.user, full_name: p.full_name || 'Unknown',
      avatar_url: p.avatar_url || null, email: p.email || '', university: p.university || undefined,
    })))
  } catch (e) { return handleResult<SuggestedUser[]>(null, fbError(e)) }
}

export async function getPendingFriendRequests(userId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'friend_requests'), where('receiver', '==', userId), where('status', '==', 'pending')))
    const requests = await Promise.all(snap.docs.map(async (d) => {
      const r = d.data()
      const profile = await getUserProfile(r.sender)
      return {
        id: d.id,
        sender: profile ? { id: r.sender, full_name: profile.full_name || 'Unknown', avatar_url: profile.avatar_url } : null,
        status: r.status, created_at: r.created_at || new Date().toISOString(),
      }
    }))
    return handleResult<any[]>(requests)
  } catch (e) { return handleResult<any[]>(null, fbError(e)) }
}

export async function getSentFriendRequests(userId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'friend_requests'), where('sender', '==', userId), where('status', '==', 'pending')))
    return handleResult<string[]>(snap.docs.map(d => d.data().receiver))
  } catch (e) { return handleResult<string[]>(null, fbError(e)) }
}

export async function areFriends(userId: string, otherId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'friend_requests'),
      where('sender', 'in', [userId, otherId]), where('receiver', 'in', [userId, otherId]), where('status', '==', 'accepted')))
    return handleResult<boolean>(!snap.empty)
  } catch (e) { return handleResult<boolean>(false, fbError(e)) }
}

export async function hasPendingRequest(userId: string, otherId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'friend_requests'),
      where('sender', 'in', [userId, otherId]), where('receiver', 'in', [userId, otherId]), where('status', '==', 'pending')))
    return handleResult<boolean>(!snap.empty)
  } catch (e) { return handleResult<boolean>(false, fbError(e)) }
}

// ── Notifications ──
export interface DbNotification {
  id: string; user_id: string; type: string; title: string; body: string; link: string | null; actor_id: string | null; read: boolean; created_at: string
}

async function notify(userId: string, type: string, title: string, body: string, link?: string, actorId?: string) {
  try {
    await addDoc(collection(db, 'notifications'), {
      user: userId, type, title, body,
      link: link || '', actor: actorId || '', read: false, created_at: new Date().toISOString(),
    })
  } catch { /* best-effort */ }
}

export async function getNotifications(userId: string, limitCount: number = 50) {
  try {
    const q = query(collection(db, 'notifications'), where('user', '==', userId), orderBy('created_at', 'desc'), firestoreLimit(limitCount))
    const snap = await getDocs(q)
    return handleResult<DbNotification[]>(snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id, user_id: data.user, type: data.type, title: data.title, body: data.body,
        link: data.link || null, actor_id: data.actor || null, read: data.read || false,
        created_at: data.created_at || new Date().toISOString(),
      } as DbNotification
    }))
  } catch (e) { return handleResult<DbNotification[]>(null, fbError(e)) }
}

export async function getUnreadCount(userId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'notifications'), where('user', '==', userId), where('read', '==', false)))
    return { count: snap.size, error: null }
  } catch (e) { return { count: 0, error: fbError(e) } }
}

export async function markNotificationRead(id: string) {
  try { await updateDoc(doc(db, 'notifications', id), { read: true }); return handleResult<void>(null) }
  catch (e) { return handleResult<void>(null, fbError(e)) }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'notifications'), where('user', '==', userId), where('read', '==', false)))
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.update(d.ref, { read: true }))
    await batch.commit()
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Push Subscriptions ──
export async function savePushSubscription(userId: string, endpoint: string, p256dh: string, authKey: string) {
  try {
    const existing = await getDocs(query(collection(db, 'push_subscriptions'), where('user', '==', userId), where('endpoint', '==', endpoint)))
    if (!existing.empty) {
      await updateDoc(doc(db, 'push_subscriptions', existing.docs[0].id), { p256dh, auth_key: authKey })
    } else {
      await addDoc(collection(db, 'push_subscriptions'), { user: userId, endpoint, p256dh, auth_key: authKey })
    }
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, fbError(e)) }
}

export async function removePushSubscription(userId: string, endpoint: string) {
  try {
    const existing = await getDocs(query(collection(db, 'push_subscriptions'), where('user', '==', userId), where('endpoint', '==', endpoint)))
    for (const d of existing.docs) await deleteDoc(d.ref)
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Profile ──
export interface DbProfile {
  id: string; user_id: string; full_name: string | null; email: string | null; avatar_url: string | null;
  university: string | null; course: string | null; year_of_study: string | null;
  created_at: string; updated_at: string
}

export async function getProfile(userId: string) {
  try {
    const q = query(collection(db, 'profiles'), where('user', '==', userId), firestoreLimit(1))
    const snap = await getDocs(q)
    if (snap.empty) return handleResult<DbProfile>(null)
    const r = snap.docs[0].data()
    return handleResult<DbProfile>({
      id: snap.docs[0].id, user_id: userId, full_name: r.full_name || null, email: r.email || null,
      avatar_url: r.avatar_url || null, university: r.university || null, course: r.course || null,
      year_of_study: r.year_of_study || null,
      created_at: r.created_at || new Date().toISOString(), updated_at: r.updated_at || new Date().toISOString(),
    })
  } catch (e) { return handleResult<DbProfile>(null, fbError(e)) }
}

export async function upsertProfile(userId: string, data: Partial<DbProfile>) {
  try {
    const existing = await getDocs(query(collection(db, 'profiles'), where('user', '==', userId), firestoreLimit(1)))
    const profileData: any = { updated_at: new Date().toISOString() }
    if (data.full_name !== undefined) profileData.full_name = data.full_name
    if (data.email !== undefined) profileData.email = data.email
    if (data.avatar_url !== undefined) profileData.avatar_url = data.avatar_url
    if (data.university !== undefined) profileData.university = data.university
    if (data.course !== undefined) profileData.course = data.course
    if (data.year_of_study !== undefined) profileData.year_of_study = data.year_of_study

    if (!existing.empty) {
      await updateDoc(doc(db, 'profiles', existing.docs[0].id), profileData)
    } else {
      profileData.user = userId
      if (!profileData.email) profileData.email = auth.currentUser?.email || ''
      profileData.created_at = new Date().toISOString()
      await addDoc(collection(db, 'profiles'), profileData)
    }
    return getProfile(userId)
  } catch (e) { return handleResult<DbProfile>(null, fbError(e)) }
}

// ── Feedback ──
export async function submitFeedback(userId: string | null, data: { name: string; email: string; message: string; rating?: number }) {
  try {
    await addDoc(collection(db, 'feedback'), {
      user: userId || null, ...data,
      user_agent: navigator.userAgent, url: window.location.href, created_at: new Date().toISOString(),
    })
    return handleResult<void>(null)
  } catch (e) { return handleResult<void>(null, fbError(e)) }
}

// ── Onboarding ──
export async function completeOnboarding(userId: string, data: { full_name: string; university: string; course: string; year_of_study: string }) {
  return upsertProfile(userId, data)
}

export async function isOnboarded(userId: string) {
  try {
    const q = query(collection(db, 'profiles'), where('user', '==', userId), where('university', '!=', ''), firestoreLimit(1))
    const snap = await getDocs(q)
    return handleResult<boolean>(!snap.empty)
  } catch (e) { return handleResult<boolean>(false, fbError(e)) }
}

// ── Dashboard Helpers ──
export async function getTodayTasks(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const q = query(collection(db, 'tasks'), where('user', '==', userId), where('due_date', '==', today), orderBy('due_date'))
    const snap = await getDocs(q)
    return handleResult<DbTask[]>(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
  } catch (e) { return handleResult<DbTask[]>(null, fbError(e)) }
}

export async function getTodayHabits(userId: string) {
  return getHabits(userId)
}

// ── Adapter Functions (component compatibility) ──
export async function markAsRead(id: string) {
  try { await updateDoc(doc(db, 'notifications', id), { read: true }); return { error: null } }
  catch (e) { return { error: fbError(e) } }
}

export async function markAllAsRead(userId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'notifications'), where('user', '==', userId), where('read', '==', false)))
    const batch = writeBatch(db)
    snap.docs.forEach(d => batch.update(d.ref, { read: true }))
    await batch.commit()
    return { error: null }
  } catch (e) { return { error: fbError(e) } }
}

export async function getStreakCalendar(userId: string, year: number, month: number) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`
    const q = query(collection(db, 'streak_posts'), where('user', '==', userId),
      where('created_at', '>=', startDate), where('created_at', '<', endDate), orderBy('created_at'))
    const snap = await getDocs(q)
    const posted_dates = snap.docs.map(d => d.data().created_at as string)
    return { data: { posted_dates }, error: null }
  } catch (e) { return { data: { posted_dates: [] }, error: fbError(e) } }
}

export interface DbFriendRequest {
  id: string; sender: { id: string; full_name: string; avatar_url: string | null } | null; status: string; created_at: string
}

export async function getFriendRequests(userId: string) {
  try {
    const snap = await getDocs(query(collection(db, 'friend_requests'), where('receiver', '==', userId), where('status', '==', 'pending')))
    const requests: DbFriendRequest[] = await Promise.all(snap.docs.map(async (d) => {
      const r = d.data()
      const profile = await getUserProfile(r.sender)
      return {
        id: d.id,
        sender: profile ? { id: r.sender, full_name: profile.full_name || 'Unknown', avatar_url: profile.avatar_url } : null,
        status: r.status as string, created_at: (r.created_at as string) || new Date().toISOString(),
      }
    }))
    return handleResult<DbFriendRequest[]>(requests)
  } catch (e) { return handleResult<DbFriendRequest[]>(null, fbError(e)) }
}

export async function getFriendRequestStatus(targetUserId: string) {
  const currentUserId = getCurrentUserId()
  if (!currentUserId) return { data: null, error: 'Not authenticated' }
  try {
    const snap = await getDocs(query(collection(db, 'friend_requests'),
      where('sender', 'in', [currentUserId, targetUserId]), where('receiver', 'in', [currentUserId, targetUserId])))
    if (snap.empty) return { data: { status: 'none' }, error: null }
    const records = snap.docs.map(d => d.data())
    const accepted = records.find(r => r.status === 'accepted')
    if (accepted) return { data: { status: 'accepted' }, error: null }
    const pending = records.find(r => r.status === 'pending')
    if (pending) return { data: { status: 'pending' }, error: null }
    return { data: { status: records[0].status as string }, error: null }
  } catch (e) { return { data: null, error: fbError(e) } }
}
