import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/app/layout/RootLayout'
import { DashboardPage } from '@/pages/dashboard'
import {
  SchedulePage,
  OrdersPage,
  MachinesPage,
  CatalogPage,
  ConflictsPage,
  AnalyticsPage,
  CalendarPage,
  SettingsPage,
  NotFoundPage,
} from './lazy-pages'

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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
