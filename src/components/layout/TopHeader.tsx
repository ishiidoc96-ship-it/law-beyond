import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../../features/notifications/NotificationBell'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/planner', label: 'Planner' },
  { to: '/streaks', label: 'Streaks' },
  { to: '/budget', label: 'Budget' },
  { to: '/habits', label: 'Habits' },
  { to: '/journal', label: 'Journal' },
]

export default function TopHeader() {
  const { profile } = useAuth()
  const initials = (profile?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="hidden md:flex sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40 h-16 px-8 items-center justify-between">
      <div className="flex items-center gap-2.5">
        <img src="/logo.svg" alt="LB" className="w-8 h-8 rounded-xl" />
        <span className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">LB</span>
      </div>
      <nav aria-label="Header navigation" className="flex gap-1">
        {navLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              isActive
                ? 'text-primary font-bold font-label-md text-label-md px-4 py-2 rounded-full bg-primary/8 transition-all'
                : 'text-on-surface-variant font-label-md text-label-md px-4 py-2 rounded-full hover:bg-surface-container-low hover:text-on-surface transition-all'
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <NavLink
          to="/profile"
          aria-label="Profile"
          className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-label-sm font-bold hover:opacity-80 transition-opacity active:scale-95 overflow-hidden"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </NavLink>
      </div>
    </header>
  )
}
