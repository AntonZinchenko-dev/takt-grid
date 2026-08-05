import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '@/app/layout/RootLayout'
import { DashboardPage } from '@/pages/dashboard'
import { RequireAuth } from './RequireAuth'
import {
  SchedulePage,
  OrdersPage,
  MachinesPage,
  CatalogPage,
  ConflictsPage,
  AnalyticsPage,
  SettingsPage,
  ProfilePage,
  LoginPage,
  NotFoundPage,
} from './lazy-pages'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/matrix', element: <SchedulePage /> },
      { path: '/orders', element: <OrdersPage /> },
      { path: '/machines', element: <MachinesPage /> },
      { path: '/catalog', element: <CatalogPage /> },
      { path: '/conflicts', element: <ConflictsPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
