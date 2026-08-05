import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/** Общий каркас правой панели — используется всеми drawer'ами настроек (см. src/pages/settings/ui/drawers). */
export function Drawer({ title, subtitle, onClose, children }: DrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--color-ink-600)]">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
