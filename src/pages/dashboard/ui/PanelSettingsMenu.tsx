import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'
import { useDashboardLayoutStore } from '../model/use-dashboard-layout'
import { DASHBOARD_PANELS, type DashboardPanelId } from '../model/panels'

const PANEL_LABEL: Record<DashboardPanelId, string> = Object.fromEntries(DASHBOARD_PANELS.map((p) => [p.id, p.label])) as Record<
  DashboardPanelId,
  string
>

export function PanelSettingsMenu() {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragId = useRef<DashboardPanelId | null>(null)
  const [open, setOpen] = useState(false)
  const [dragOverId, setDragOverId] = useState<DashboardPanelId | null>(null)

  const order = useDashboardLayoutStore((s) => s.order)
  const hidden = useDashboardLayoutStore((s) => s.hidden)
  const toggleHidden = useDashboardLayoutStore((s) => s.toggleHidden)
  const moveUp = useDashboardLayoutStore((s) => s.moveUp)
  const moveDown = useDashboardLayoutStore((s) => s.moveDown)
  const reorder = useDashboardLayoutStore((s) => s.reorder)
  const reset = useDashboardLayoutStore((s) => s.reset)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        <SlidersHorizontal className="h-4 w-4" />
        Панели
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">Панели дашборда</p>
            <button
              onClick={reset}
              className="flex items-center gap-1 text-xs font-medium text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
            >
              <RotateCcw className="h-3 w-3" />
              Сбросить
            </button>
          </div>

          <ul className="max-h-96 overflow-y-auto py-1">
            {order.map((id, index) => {
              const isHidden = hidden.includes(id)
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={() => {
                    dragId.current = id
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragOverId !== id) setDragOverId(id)
                  }}
                  onDragLeave={() => setDragOverId((current) => (current === id ? null : current))}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragId.current) reorder(dragId.current, id)
                    dragId.current = null
                    setDragOverId(null)
                  }}
                  onDragEnd={() => {
                    dragId.current = null
                    setDragOverId(null)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 text-sm',
                    isHidden ? 'text-[var(--color-ink-400)]' : 'text-[var(--color-ink-900)]',
                    dragOverId === id && 'bg-[var(--color-canvas)]',
                  )}
                >
                  <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[var(--color-ink-400)]" />
                  <span className="min-w-0 flex-1 truncate">{PANEL_LABEL[id]}</span>

                  <button
                    onClick={() => moveUp(id)}
                    disabled={index === 0}
                    aria-label="Переместить выше"
                    className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink-900)] disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveDown(id)}
                    disabled={index === order.length - 1}
                    aria-label="Переместить ниже"
                    className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink-900)] disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleHidden(id)}
                    aria-label={isHidden ? 'Показать панель' : 'Скрыть панель'}
                    className="rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink-900)]"
                  >
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
