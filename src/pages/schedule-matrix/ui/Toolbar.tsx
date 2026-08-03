import { observer } from 'mobx-react-lite'
import { CalendarIcon, Plus } from 'lucide-react'
import type { GridStore } from '../model/grid-store'
import { ZOOM_LABEL, type ZoomLevel } from '../lib/timeline'
import type { Workshop } from '@/entities/workshop'
import { statusLabel, priorityLabel, type OrderPriority, type OrderStatus } from '@/entities/order'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

const ZOOM_LEVELS: ZoomLevel[] = ['hour', 'day', 'week']
const STATUS_OPTIONS: OrderStatus[] = ['planned', 'in_progress', 'at_risk', 'overdue', 'done']
const PRIORITY_OPTIONS: OrderPriority[] = ['low', 'normal', 'high', 'critical']

interface ToolbarProps {
  store: GridStore
  workshops: Workshop[]
  onCreateOrder: () => void
}

export const Toolbar = observer(function Toolbar({ store, workshops, onCreateOrder }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
      <select
        value={store.filters.workshopId ?? 'all'}
        onChange={(e) => store.setWorkshopFilter(e.target.value === 'all' ? null : e.target.value)}
        className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm text-[var(--color-ink-900)]"
      >
        <option value="all">Цех: Все</option>
        {workshops.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
      <select
        value={store.filters.status ?? 'all'}
        onChange={(e) => store.setStatusFilter(e.target.value === 'all' ? null : (e.target.value as OrderStatus))}
        className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm text-[var(--color-ink-900)]"
      >
        <option value="all">Статус: Все</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
      <select
        value={store.filters.priority ?? 'all'}
        onChange={(e) => store.setPriorityFilter(e.target.value === 'all' ? null : (e.target.value as OrderPriority))}
        className="h-9 rounded-lg border border-[var(--color-border)] bg-white px-2.5 text-sm text-[var(--color-ink-900)]"
      >
        <option value="all">Приоритет: Все</option>
        {PRIORITY_OPTIONS.map((p) => (
          <option key={p} value={p}>
            {priorityLabel(p)}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => store.setZoom(level)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                store.zoom === level ? 'bg-[var(--color-brand-600)] text-white' : 'bg-white text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]',
              )}
            >
              {ZOOM_LABEL[level]}
            </button>
          ))}
        </div>

        <Button size="sm" variant="secondary" onClick={() => store.jumpToDate(new Date())}>
          <CalendarIcon className="h-3.5 w-3.5" />
          Сегодня
        </Button>

        <Button size="sm" variant="primary" onClick={onCreateOrder}>
          <Plus className="h-3.5 w-3.5" />
          Создать заказ
        </Button>
      </div>
    </div>
  )
})
