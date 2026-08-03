import { lazy } from 'react'

export const SchedulePage = lazy(() =>
  import('@/pages/schedule-matrix').then((m) => ({ default: m.SchedulePage })),
)
export const OrdersPage = lazy(() =>
  import('@/pages/orders').then((m) => ({ default: m.OrdersPage })),
)
export const MachinesPage = lazy(() =>
  import('@/pages/machines').then((m) => ({ default: m.MachinesPage })),
)
export const CatalogPage = lazy(() =>
  import('@/pages/catalog').then((m) => ({ default: m.CatalogPage })),
)
export const ConflictsPage = lazy(() =>
  import('@/pages/conflicts').then((m) => ({ default: m.ConflictsPage })),
)
export const AnalyticsPage = lazy(() =>
  import('@/pages/analytics').then((m) => ({ default: m.AnalyticsPage })),
)
export const CalendarPage = lazy(() =>
  import('@/pages/calendar').then((m) => ({ default: m.CalendarPage })),
)
export const SettingsPage = lazy(() =>
  import('@/pages/settings').then((m) => ({ default: m.SettingsPage })),
)
export const NotFoundPage = lazy(() =>
  import('@/pages/not-found').then((m) => ({ default: m.NotFoundPage })),
)
