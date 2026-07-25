import NotificationsBell from '../../features/notifications/NotificationBell'

export default function TopHeader() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-outline-variant/20">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">balance</span>
          </div>
          <h1 className="font-[family-name:var(--font-headline-lg)] text-lg font-bold text-on-surface">
            Law Beyond
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <NotificationsBell />
        </div>
      </div>
    </header>
  )
}
