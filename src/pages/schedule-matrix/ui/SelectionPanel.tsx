import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import { ArrowRightLeft, Copy, Pencil, Trash2, X } from 'lucide-react'
import type { GridStore } from '../model/grid-store'
import type { OccupancyIndex } from '@/shared/lib/occupancy-index'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import type { Order, OrderStatus } from '@/entities/order'
import { statusLabel } from '@/entities/order'
import { Button } from '@/shared/ui/Button'
import { Legend } from './Legend'
import { Minimap } from './Minimap'

const STATUS_DOT: Record<OrderStatus, string> = {
  planned: 'var(--color-priority-normal)',
  in_progress: 'var(--color-priority-low)',
  at_risk: 'var(--color-priority-high)',
  overdue: 'var(--color-priority-critical)',
  done: 'var(--color-priority-done)',
}

interface SelectionPanelProps {
  store: GridStore
  occupancyIndex: OccupancyIndex
  assignmentsById: Map<string, ScheduleAssignment>
  ordersById: Map<string, Order>
  onOpenBulkEdit: () => void
}

export const SelectionPanel = observer(function SelectionPanel({ store, occupancyIndex, assignmentsById, ordersById, onOpenBulkEdit }: SelectionPanelProps) {
  const selection = store.selection
  const range = store.selectionRangeMs
  const machines = store.selectedMachines

  const summary = useMemo(() => {
    if (!selection || !range) return null

    const orders: Order[] = []
    let machineHours = 0
    for (const machine of machines) {
      const overlapping = occupancyIndex.findOverlapping(machine.id, range.start, range.end)
      for (const interval of overlapping) {
        machineHours += (Math.min(interval.end, range.end) - Math.max(interval.start, range.start)) / 3_600_000
        const assignment = assignmentsById.get(interval.id)
        const order = assignment ? ordersById.get(assignment.orderId) : undefined
        if (order) orders.push(order)
      }
    }

    const statusCounts = new Map<OrderStatus, number>()
    for (const order of orders) statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1)

    const durationHours = selection.hourEnd - selection.hourStart

    return { orders, machineHours: Math.round(machineHours), durationHours, statusCounts }
  }, [selection, range, machines, occupancyIndex, assignmentsById, ordersById])

  if (!selection || !summary) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
        <p className="text-xs text-[var(--color-ink-600)]">
          <span className="font-medium text-[var(--color-ink-900)]">Выделение:</span> перетащите мышью по ячейкам одного или нескольких станков
        </p>
        <div className="flex items-center gap-6">
          <Legend />
          <Minimap store={store} />
        </div>
      </div>
    )
  }

  const cellCount = (selection.hourEnd - selection.hourStart) * (selection.rowEnd - selection.rowStart + 1)

  return (
    <div className="grid grid-cols-1 gap-6 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 lg:grid-cols-[auto_1fr_auto_auto]">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-ink-900)]">Выделено: {cellCount} ячеек</span>
          <button onClick={() => store.clearSelection()} className="flex items-center gap-1 text-xs font-medium text-[var(--color-brand-600)] hover:underline">
            <X className="h-3 w-3" />
            Снять выделение
          </button>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 text-xs">
          <dt className="text-[var(--color-ink-600)]">Длительность</dt>
          <dd className="text-right font-medium text-[var(--color-ink-900)]">{summary.durationHours} ч 00 мин</dd>
          <dt className="text-[var(--color-ink-600)]">Машино-часы</dt>
          <dd className="text-right font-medium text-[var(--color-ink-900)]">{summary.machineHours} ч</dd>
          <dt className="text-[var(--color-ink-600)]">Заказов</dt>
          <dd className="text-right font-medium text-[var(--color-ink-900)]">{summary.orders.length}</dd>
          <dt className="text-[var(--color-ink-600)]">Станков / линий</dt>
          <dd className="text-right font-medium text-[var(--color-ink-900)]">{machines.length}</dd>
        </dl>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Статусы выбранных заказов</p>
        <ul className="space-y-1 text-xs text-[var(--color-ink-600)]">
          {[...summary.statusCounts.entries()].map(([status, count]) => (
            <li key={status} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_DOT[status] }} />
              {statusLabel(status)}
              <span className="ml-auto font-medium text-[var(--color-ink-900)]">{count}</span>
            </li>
          ))}
          {summary.statusCounts.size === 0 && <li className="text-[var(--color-ink-400)]">Нет заказов в диапазоне</li>}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Быстрые действия</p>
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="primary" onClick={onOpenBulkEdit} disabled={summary.orders.length === 0} className="justify-start">
            <Pencil className="h-3.5 w-3.5" />
            Массовое редактирование
          </Button>
          <Button size="sm" variant="secondary" title="Групповой перенос всего выделения — этап 4 роадмапа. Перенос одного блока уже работает: просто перетащите его." className="justify-start">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Перенести
          </Button>
          <Button size="sm" variant="secondary" title="Дублирование выбранных заказов — не в текущем срезе" className="justify-start">
            <Copy className="h-3.5 w-3.5" />
            Копировать
          </Button>
          <Button size="sm" variant="danger" title="Удаление заказов — не в текущем срезе" className="justify-start">
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Legend />
        <Minimap store={store} />
      </div>
    </div>
  )
})
