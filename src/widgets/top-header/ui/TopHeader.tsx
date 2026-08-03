import type { ReactNode } from 'react'
import { Search, Bell, HelpCircle } from 'lucide-react'

interface TopHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function TopHeader({ title, subtitle, actions }: TopHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
      <div className="min-w-0 shrink-0">
        <h1 className="truncate text-lg font-semibold text-[var(--color-ink-900)]">{title}</h1>
        {subtitle && <p className="truncate text-xs text-[var(--color-ink-600)]">{subtitle}</p>}
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-400)]" />
        <input
          type="text"
          placeholder="Поиск заказов, станков, продуктов..."
          className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] pl-9 pr-3 text-sm text-[var(--color-ink-900)] outline-none placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-brand-500)] focus:bg-white"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]" aria-label="Уведомления">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-semibold text-white">3</span>
        </button>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]" aria-label="Справка">
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <div className="ml-1 flex items-center gap-2.5 border-l border-[var(--color-border)] pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-xs font-semibold text-white">ИП</div>
          <div className="hidden leading-tight md:block">
            <p className="text-sm font-medium text-[var(--color-ink-900)]">Иван Петров</p>
            <p className="text-xs text-[var(--color-ink-600)]">Планировщик</p>
          </div>
        </div>
      </div>
    </header>
  )
}
