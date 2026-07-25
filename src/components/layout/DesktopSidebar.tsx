import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/planner', label: 'Planner', icon: 'calendar_today' },
  { to: '/streaks', label: 'Streaks', icon: 'local_fire_department' },
  { to: '/budget', label: 'Budget', icon: 'account_balance_wallet' },
  { to: '/habits', label: 'Habits', icon: 'self_improvement' },
  { to: '/journal', label: 'Journal', icon: 'auto_stories' },
  { to: '/profile', label: 'Profile', icon: 'person' },
]

export default function DesktopSidebar() {
  return (
    <nav aria-label="Sidebar navigation" className="hidden md:flex h-screen w-[260px] fixed left-0 top-0 bg-surface border-r border-outline-variant/60 flex-col py-6 px-5 z-50">
      <div className="mb-8 flex items-center gap-3">
        <img src="/logo.svg" alt="LB" className="w-10 h-10 rounded-xl" />
        <span className="font-headline-md text-headline-md font-bold text-on-surface tracking-tight">LB</span>
      </div>
      <ul className="flex flex-col gap-1 flex-grow">
        {navItems.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-3 px-4 py-3 rounded-2xl text-primary font-bold bg-primary/10 transition-all'
                  : 'flex items-center gap-3 px-4 py-3 rounded-2xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all'
              }
            >
              <span className="material-symbols-outlined text-[22px]">{icon}</span>
              <span className="font-label-md text-label-md">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4">
        <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-4 text-center">
          <span className="material-symbols-outlined text-[28px] text-on-primary mb-1">local_fire_department</span>
          <p className="font-label-md text-label-md text-on-primary font-medium">Keep your streak alive!</p>
        </div>
      </div>
    </nav>
  )
}
