import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import DesktopSidebar from './DesktopSidebar'
import TopHeader from './TopHeader'
import { usePushSubscription } from '../../hooks/usePushSubscription'

export default function Layout() {
  usePushSubscription()

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <div className="md:ml-[260px] min-h-screen flex flex-col">
        <TopHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
