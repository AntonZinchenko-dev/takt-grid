import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/Button'

export function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-50)]">
        <Compass className="h-8 w-8 text-[var(--color-brand-600)]" strokeWidth={1.75} />
      </div>

      <div className="space-y-1.5">
        <p className="text-5xl font-semibold tracking-tight text-[var(--color-ink-900)]">404</p>
        <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Страница не найдена</h1>
        <p className="max-w-sm text-sm text-[var(--color-ink-600)]">
          Такого адреса нет в TaktGrid — возможно, ссылка устарела или в URL опечатка.
        </p>
      </div>

      <Link to="/">
        <Button variant="primary">
          <ArrowLeft className="h-4 w-4" />
          На дашборд
        </Button>
      </Link>
    </main>
  )
}
