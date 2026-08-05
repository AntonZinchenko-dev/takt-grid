export interface SessionUser {
  username: string
  name: string
  role: string
  email: string
  phone: string
  department: string
  workshopName: string
  shiftLabel: string
  hiredAt: string
}

export interface NotificationPrefs {
  email: boolean
  push: boolean
  conflicts: boolean
  deadline: boolean
  downtime: boolean
  nightlyReport: boolean
}

export interface WorkPreferences {
  homeScreen: 'matrix' | 'dashboard'
  /** Совпадает по значениям с ZoomLevel из pages/schedule-matrix — не импортируем тип напрямую, entities не может зависеть от pages (FSD). */
  defaultZoom: 'hour' | 'day' | 'week'
  density: 'compact' | 'comfortable' | 'large'
  theme: 'light' | 'dark'
}

export interface LoginHistoryEntry {
  at: string
  device: string
}
