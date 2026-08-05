import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { SessionUser, NotificationPrefs, WorkPreferences, LoginHistoryEntry } from './types'

/**
 * Мок-авторизация: единственный демо-пользователь admin/admin (см. LoginPage — креды
 * показаны прямо на форме, это учебный проект без реального бэкенда).
 */
const MOCK_USER: SessionUser = {
  username: 'admin',
  name: 'Иван Петров',
  role: 'Планировщик',
  email: 'petrov@company.ru',
  phone: '+7 (999) 123-45-67',
  department: 'Производственный отдел',
  workshopName: 'Завод №2, Цех металлообработки',
  shiftLabel: 'Смена A (08:00 – 17:00)',
  hiredAt: '2023-03-12',
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  email: true,
  push: true,
  conflicts: true,
  deadline: true,
  downtime: true,
  nightlyReport: false,
}

const DEFAULT_PREFERENCES: WorkPreferences = {
  homeScreen: 'matrix',
  defaultZoom: 'day',
  density: 'comfortable',
  theme: 'light',
}

const MAX_LOGIN_HISTORY = 5

/** Грубое опознание браузера/ОС по UA — только для витринного списка "Активные сессии/История входов". */
function describeDevice(): string {
  const ua = navigator.userAgent
  const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac OS') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Неизвестная ОС'
  const browser = ua.includes('Edg/') ? 'Edge' : ua.includes('Chrome/') ? 'Chrome' : ua.includes('Firefox/') ? 'Firefox' : ua.includes('Safari/') ? 'Safari' : 'Браузер'
  return `${os} · ${browser}`
}

/**
 * "Запомнить меня" реализуем выбором хранилища, а не булевым флагом внутри persist-стейта:
 * localStorage переживает закрытие браузера, sessionStorage — только текущую вкладку.
 * rememberMode обновляется в login() и решает, куда писать; readItem проверяет оба места,
 * чтобы сессия без "запомнить" пережила обновление страницы (F5) в той же вкладке.
 */
let rememberMode = true

const dynamicStorage: StateStorage = {
  getItem: (name) => sessionStorage.getItem(name) ?? localStorage.getItem(name),
  setItem: (name, value) => {
    if (rememberMode) {
      localStorage.setItem(name, value)
      sessionStorage.removeItem(name)
    } else {
      sessionStorage.setItem(name, value)
      localStorage.removeItem(name)
    }
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
    sessionStorage.removeItem(name)
  },
}

interface AuthState {
  user: SessionUser | null
  /** Хранится в открытом виде — учебный мок без бэкенда, не реальный секрет. */
  password: string
  twoFactorEnabled: boolean
  loginHistory: LoginHistoryEntry[]
  notifications: NotificationPrefs
  preferences: WorkPreferences

  /** true при успешном входе */
  login: (username: string, password: string, remember: boolean) => boolean
  logout: () => void
  updateProfile: (patch: Partial<Pick<SessionUser, 'name' | 'email' | 'phone' | 'department'>>) => void
  changePassword: (current: string, next: string) => boolean
  toggleTwoFactor: () => void
  setNotification: (key: keyof NotificationPrefs, value: boolean) => void
  setPreferences: (patch: Partial<WorkPreferences>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      password: 'admin',
      twoFactorEnabled: false,
      loginHistory: [],
      notifications: DEFAULT_NOTIFICATIONS,
      preferences: DEFAULT_PREFERENCES,

      login: (username, passwordInput, remember) => {
        if (username.trim().toLowerCase() !== 'admin' || passwordInput !== get().password) return false
        rememberMode = remember
        const entry: LoginHistoryEntry = { at: new Date().toISOString(), device: describeDevice() }
        set((s) => ({ user: MOCK_USER, loginHistory: [entry, ...s.loginHistory].slice(0, MAX_LOGIN_HISTORY) }))
        return true
      },
      logout: () => set({ user: null }),
      updateProfile: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      changePassword: (current, next) => {
        if (current !== get().password || next.trim().length === 0) return false
        set({ password: next })
        return true
      },
      toggleTwoFactor: () => set((s) => ({ twoFactorEnabled: !s.twoFactorEnabled })),
      setNotification: (key, value) => set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
      setPreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
    }),
    { name: 'taktgrid-auth', storage: createJSONStorage(() => dynamicStorage) },
  ),
)
