import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useAuthStore, type SessionUser } from '@/entities/session'
import { Button } from '@/shared/ui/Button'

export function ProfileEditDrawer({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [department, setDepartment] = useState(user?.department ?? '')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const patch: Partial<Pick<SessionUser, 'name' | 'email' | 'phone' | 'department'>> = {}
    if (name.trim()) patch.name = name.trim()
    patch.email = email.trim()
    patch.phone = phone.trim()
    patch.department = department.trim()
    updateProfile(patch)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Редактировать профиль</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 px-5 py-4">
          <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
            Имя и фамилия
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
            Рабочий email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
            Телефон
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
            Подразделение
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </label>
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
    </div>
  )
}
