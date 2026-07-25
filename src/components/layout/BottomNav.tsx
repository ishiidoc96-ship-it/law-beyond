import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/habits', icon: 'check_circle', label: 'Habits' },
  { to: '/streaks', icon: 'local_fire_department', label: 'Streaks' },
  { to: '/budget', icon: 'savings', label: 'Budget' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-outline-variant/20 pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-200 ${
                isActive
                  ? 'text-primary scale-105'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
                      isActive ? 'filled' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full animate-nav-indicator" />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
