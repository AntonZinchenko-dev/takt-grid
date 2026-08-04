import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { Grid3x3, Loader2, Lock, User } from 'lucide-react'
import { useAuthStore } from '@/entities/session'
import { Button } from '@/shared/ui/Button'

export function LoginPage() {
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  // Уже авторизован — форма логина не нужна, возвращаем туда, откуда пришли (см. RequireAuth).
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(false)
    // Искусственная задержка — чтобы форма ощущалась как настоящий запрос, а не мгновенный мок.
    window.setTimeout(() => {
      const ok = login(username, password, remember)
      setPending(false)
      if (!ok) {
        setError(true)
        return
      }
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    }, 300)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-600)]">
            <Grid3x3 className="h-5.5 w-5.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight text-[var(--color-ink-900)]">TaktGrid</p>
            <p className="text-xs leading-tight text-[var(--color-ink-600)]">Производственное планирование</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
        >
          <h1 className="mb-1 text-base font-semibold text-[var(--color-ink-900)]">Вход в систему</h1>
          <p className="mb-5 text-xs text-[var(--color-ink-600)]">Демо-доступ: логин и пароль — admin / admin</p>

          <label className="mb-3 block text-xs font-semibold text-[var(--color-ink-900)]">
            Логин
            <div className="relative mt-1">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-400)]" />
              <input
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(false)
                }}
                placeholder="admin"
                className="h-10 w-full rounded-lg border border-[var(--color-border)] pl-9 pr-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
              />
            </div>
          </label>

          <label className="mb-3 block text-xs font-semibold text-[var(--color-ink-900)]">
            Пароль
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-400)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                placeholder="admin"
                className="h-10 w-full rounded-lg border border-[var(--color-border)] pl-9 pr-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
              />
            </div>
          </label>

          <label className="mb-4 flex items-center gap-2 text-xs font-medium text-[var(--color-ink-600)]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]"
            />
            Запомнить меня на этом устройстве
          </label>

          {error && <p className="mb-3 text-xs font-medium text-red-600">Неверный логин или пароль. Подсказка: admin / admin.</p>}

          <Button type="submit" variant="primary" disabled={pending} className="w-full justify-center">
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Войти
          </Button>
        </form>
      </div>
    </div>
  )
}
