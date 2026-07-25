import { NavLink } from 'react-router-dom'
import { memo } from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import { hapticNav } from '../../lib/haptics'

const navItems = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/planner', icon: 'calendar_month', label: 'Planner' },
  { to: '/streaks', icon: 'local_fire_department', label: 'Streaks' },
  { to: '/budget', icon: 'account_balance_wallet', label: 'Budget' },
]

export default memo(function BottomNav() {
  const { unread } = useNotifications()

  return (
    <nav aria-label="Main navigation" className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center h-[72px] bg-surface/80 backdrop-blur-xl border-t border-outline-variant/20 pb-safe">
      {navItems.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          onClick={hapticNav}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-2xl px-4 py-1.5 active:scale-95 transition-all duration-300 ease-out ${
              isActive
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`material-symbols-outlined text-[24px] transition-all duration-300 ${isActive ? 'fill-primary' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
              </span>
              <span className={`text-[11px] font-label-sm font-semibold mt-0.5 transition-all duration-300 ${isActive ? 'text-primary' : ''}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
      <NavLink
        to="/profile"
        aria-label="Profile"
        onClick={hapticNav}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center rounded-2xl px-4 py-1.5 active:scale-95 transition-all duration-300 ease-out relative ${
            isActive
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`material-symbols-outlined text-[24px] transition-all duration-300 ${isActive ? 'fill-primary' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
              person
            </span>
            {unread > 0 && (
              <span className="absolute top-0.5 right-2 min-w-[16px] h-[16px] rounded-full bg-error text-on-error text-[9px] font-bold flex items-center justify-center px-1 shadow-brand-sm">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
            <span className={`text-[11px] font-label-sm font-semibold mt-0.5 transition-all duration-300 ${isActive ? 'text-primary' : ''}`}>
              Profile
            </span>
          </>
        )}
      </NavLink>
    </nav>
  )
})
