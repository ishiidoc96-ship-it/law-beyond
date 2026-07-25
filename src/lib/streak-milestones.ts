export interface StreakMilestone {
  days: number
  type: string
  title: string
  description: string
  icon: string
  emoji: string
  color: string
  bgColor: string
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, type: 'first_steps', title: 'First Steps', description: '3-day streak!', icon: 'local_fire_department', emoji: '🔥', color: 'text-orange-500', bgColor: 'bg-orange-500/15' },
  { days: 7, type: 'one_week', title: 'One Week Warrior', description: '7-day streak!', icon: 'stars', emoji: '⭐', color: 'text-yellow-500', bgColor: 'bg-yellow-500/15' },
  { days: 14, type: 'two_weeks', title: 'Fortnight Fighter', description: '14-day streak!', icon: 'military_tech', emoji: '🎖️', color: 'text-amber-600', bgColor: 'bg-amber-600/15' },
  { days: 30, type: 'monthly_master', title: 'Monthly Master', description: '30-day streak!', icon: 'trophy', emoji: '🏆', color: 'text-yellow-600', bgColor: 'bg-yellow-600/15' },
  { days: 50, type: 'half_century', title: 'Half Century', description: '50-day streak!', icon: 'diamond', emoji: '💎', color: 'text-cyan-500', bgColor: 'bg-cyan-500/15' },
  { days: 100, type: 'centurion', title: 'Centurion', description: '100-day streak!', icon: 'emoji_events', emoji: '💯', color: 'text-primary', bgColor: 'bg-primary/15' },
  { days: 200, type: 'legend', title: 'Legend', description: '200-day streak!', icon: 'shield', emoji: '🛡️', color: 'text-purple-500', bgColor: 'bg-purple-500/15' },
  { days: 365, type: 'year_champion', title: 'Year Champion', description: '365-day streak!', icon: 'workspace_premium', emoji: '👑', color: 'text-amber-500', bgColor: 'bg-amber-500/15' },
]

export function getMilestoneForStreak(streak: number): StreakMilestone | null {
  let match: StreakMilestone | null = null
  for (const m of STREAK_MILESTONES) {
    if (streak >= m.days) match = m
  }
  return match
}

export function getNextMilestone(streak: number): StreakMilestone | null {
  for (const m of STREAK_MILESTONES) {
    if (streak < m.days) return m
  }
  return null
}

export function getMilestoneProgress(streak: number): number {
  const next = getNextMilestone(streak)
  if (!next) return 100
  const prev = STREAK_MILESTONES.filter(m => m.days <= streak).pop()
  const base = prev ? prev.days : 0
  return Math.round(((streak - base) / (next.days - base)) * 100)
}

export function isStreakExpiring(lastPostDate: string | null): boolean {
  if (!lastPostDate) return true
  const now = new Date()
  const lastPost = new Date(lastPostDate + 'T23:59:59')
  const hoursSince = (now.getTime() - lastPost.getTime()) / (1000 * 60 * 60)
  return hoursSince >= 18 && hoursSince < 48
}

export function isStreakBroken(lastPostDate: string | null): boolean {
  if (!lastPostDate) return false
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lastPost = new Date(lastPostDate + 'T00:00:00')
  const diffDays = Math.floor((today.getTime() - lastPost.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 2
}

export function hoursUntilExpiry(lastPostDate: string | null): number {
  if (!lastPostDate) return 0
  const now = new Date()
  const lastPost = new Date(lastPostDate + 'T23:59:59')
  const hoursSince = (now.getTime() - lastPost.getTime()) / (1000 * 60 * 60)
  return Math.max(0, 48 - hoursSince)
}
