import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/app/layout/RootLayout'
import { DashboardPage } from '@/pages/dashboard'
import { SchedulePage } from '@/pages/schedule-matrix'
import { OrdersPage } from '@/pages/orders'
import { MachinesPage } from '@/pages/machines'
import { CatalogPage } from '@/pages/catalog'
import { ConflictsPage } from '@/pages/conflicts'
import { AnalyticsPage } from '@/pages/analytics'
import { CalendarPage } from '@/pages/calendar'
import { SettingsPage } from '@/pages/settings'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/matrix', element: <SchedulePage /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/machines', element: <MachinesPage /> },
      { path: '/catalog', element: <CatalogPage /> },
      { path: '/conflicts', element: <ConflictsPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
