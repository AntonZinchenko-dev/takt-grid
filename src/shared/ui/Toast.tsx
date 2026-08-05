import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, type ToastTone } from '@/shared/lib/toast-store'

const TONE_ICON: Record<ToastTone, typeof Info> = { success: CheckCircle2, info: Info, error: AlertTriangle }
const TONE_COLOR: Record<ToastTone, { color: string; bg: string }> = {
  success: { color: 'var(--color-priority-low)', bg: 'var(--color-priority-low-bg)' },
  info: { color: 'var(--color-brand-600)', bg: 'var(--color-brand-50)' },
  error: { color: 'var(--color-priority-critical)', bg: 'var(--color-priority-critical-bg)' },
}

/** Единственная точка входа для transient-уведомлений в приложении — монтируется один раз в AppProviders. */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = TONE_ICON[toast.tone]
        const { color, bg } = TONE_COLOR[toast.tone]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm shadow-lg"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: bg, color }}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="flex-1 text-[var(--color-ink-900)]">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} aria-label="Закрыть уведомление" className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
