import { Outlet } from 'react-router-dom'
import { SidebarNav } from '@/widgets/sidebar-nav'

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)]">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
