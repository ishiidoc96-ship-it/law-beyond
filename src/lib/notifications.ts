export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const TYPE_ICONS: Record<string, string> = {
  streak_like: 'favorite',
  streak_comment: 'comment',
  streak_post: 'bolt',
  streak_reminder: 'local_fire_department',
  friend_request: 'person_add',
  friend_accepted: 'group',
  deadline: 'assignment',
  assignment_due: 'assignment',
  habit_reminder: 'check_circle',
  system: 'info',
}

export const TYPE_COLORS: Record<string, string> = {
  streak_like: 'bg-error-container/30 text-error',
  streak_comment: 'bg-primary/10 text-primary',
  streak_post: 'bg-tertiary-container/40 text-tertiary',
  streak_reminder: 'bg-warning/10 text-warning',
  friend_request: 'bg-primary/10 text-primary',
  friend_accepted: 'bg-tertiary-container/40 text-tertiary',
  deadline: 'bg-secondary-container/40 text-secondary',
  assignment_due: 'bg-secondary-container/40 text-secondary',
  habit_reminder: 'bg-primary/10 text-primary',
  system: 'bg-surface-container-high text-on-surface-variant',
}
