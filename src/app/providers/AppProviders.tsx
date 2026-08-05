import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { ToastViewport } from '@/shared/ui/Toast'

/**
 * Синхронизирует "Тема" и "Плотность интерфейса" из профиля с атрибутами на <html> — выше RootLayout,
 * поэтому работает и на /login. Плотность живёт на <html>, а не на обёртке RootLayout, специально:
 * масштаб шрифта (index.css, html { font-size: calc(...) }) завязан на rem, а rem всегда считается
 * от font-size корневого <html>, а не ближайшего предка с атрибутом.
 */
function PreferencesSync() {
  const theme = useAuthStore((s) => s.preferences.theme)
  const density = useAuthStore((s) => s.preferences.density)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesSync />
      {children}
      <ToastViewport />
    </QueryClientProvider>
  )
}
