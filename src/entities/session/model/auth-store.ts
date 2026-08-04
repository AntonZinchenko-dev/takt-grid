import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { SessionUser } from './types'

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
  /** true при успешном входе (только admin/admin — учебный мок) */
  login: (username: string, password: string, remember: boolean) => boolean
  logout: () => void
  updateProfile: (patch: Partial<Pick<SessionUser, 'name' | 'email' | 'phone' | 'department'>>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (username, password, remember) => {
        if (username.trim().toLowerCase() !== 'admin' || password !== 'admin') return false
        rememberMode = remember
        set({ user: MOCK_USER })
        return true
      },
      logout: () => set({ user: null }),
      updateProfile: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
    }),
    { name: 'taktgrid-auth', storage: createJSONStorage(() => dynamicStorage) },
  ),
)
