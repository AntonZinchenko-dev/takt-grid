import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { SidebarNav } from '@/widgets/sidebar-nav'

function RouteFallback() {
  return (
    <div className="flex h-full items-center justify-center text-[var(--color-ink-400)]">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )
}

export function RootLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-canvas)]">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
