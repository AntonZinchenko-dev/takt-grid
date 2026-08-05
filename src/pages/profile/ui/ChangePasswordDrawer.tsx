import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '@/entities/session'
import { usePasswordPolicyStore, validatePassword } from '@/entities/setting'
import { Button } from '@/shared/ui/Button'

export function ChangePasswordDrawer({ onClose }: { onClose: () => void }) {
  const changePassword = useAuthStore((s) => s.changePassword)
  const policy = usePasswordPolicyStore()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (next !== confirm) {
      setError('Новый пароль и подтверждение не совпадают')
      return
    }
    const policyError = validatePassword(next, policy)
    if (policyError) {
      setError(policyError)
      return
    }
    const ok = changePassword(current, next)
    if (!ok) {
      setError('Текущий пароль указан неверно')
      return
    }
    setError(null)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Изменить пароль</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex-1 px-5 py-4">
            <p className="text-sm font-medium text-[var(--color-priority-low)]">Пароль обновлён. Он понадобится при следующем входе.</p>
            <Button variant="secondary" onClick={onClose} className="mt-4 w-full justify-center">
              Готово
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-3 px-5 py-4">
              <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
                Текущий пароль
                <input
                  type="password"
                  value={current}
                  onChange={(e) => {
                    setCurrent(e.target.value)
                    setError(null)
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
                />
              </label>
              <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
                Новый пароль
                <input
                  type="password"
                  value={next}
                  onChange={(e) => {
                    setNext(e.target.value)
                    setError(null)
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
                />
              </label>
              <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
                Повторите новый пароль
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value)
                    setError(null)
                  }}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
                />
              </label>
              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" variant="primary">
                Сохранить
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
