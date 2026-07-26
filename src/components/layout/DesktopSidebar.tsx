import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/planner', icon: 'calendar_month', label: 'Planner' },
  { to: '/habits', icon: 'check_circle', label: 'Habits' },
  { to: '/journal', icon: 'menu_book', label: 'Journal' },
  { to: '/budget', icon: 'savings', label: 'Budget' },
  { to: '/streaks', icon: 'local_fire_department', label: 'Streaks' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

export default function DesktopSidebar() {
  const { user, signOut } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-surface-container-low border-r border-outline-variant/20 p-4 fixed left-0 top-0 z-30">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-xl">balance</span>
        </div>
        <h1 className="font-[family-name:var(--font-headline-lg)] text-xl font-bold text-on-surface">
          Law Beyond
        </h1>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-nav-indicator" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-outline-variant/20 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-lg">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">{user?.displayName || 'User'}</p>
            <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
