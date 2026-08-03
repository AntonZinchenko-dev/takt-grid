import { observer } from 'mobx-react-lite'
import { useMemo, useState } from 'react'
import { ArrowRightLeft, Copy, Loader2, Pencil, Trash2, X } from 'lucide-react'
import type { GridStore } from '../model/grid-store'
import { DAY_MS } from '../lib/timeline'
import type { OccupancyIndex } from '@/shared/lib/occupancy-index'
import { useMoveAssignmentMutation, type ScheduleAssignment } from '@/entities/schedule-assignment'
import type { Order, OrderStatus } from '@/entities/order'
import { statusLabel, useCreateOrderMutation, useDeleteOrderMutation } from '@/entities/order'
import { Button } from '@/shared/ui/Button'
import { ApiError } from '@/shared/api'
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

type ActionMode = 'move' | 'copy' | 'delete' | null

export const SelectionPanel = observer(function SelectionPanel({ store, occupancyIndex, assignmentsById, ordersById, onOpenBulkEdit }: SelectionPanelProps) {
  const selection = store.selection
  const range = store.selectionRangeMs
  const machines = store.selectedMachines

  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [shiftDays, setShiftDays] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)

  const moveMutation = useMoveAssignmentMutation()
  const createMutation = useCreateOrderMutation()
  const deleteMutation = useDeleteOrderMutation()

  const summary = useMemo(() => {
    if (!selection || !range) return null

    const entries: Array<{ order: Order; assignment: ScheduleAssignment }> = []
    let machineHours = 0
    for (const machine of machines) {
      const overlapping = occupancyIndex.findOverlapping(machine.id, range.start, range.end)
      for (const interval of overlapping) {
        machineHours += (Math.min(interval.end, range.end) - Math.max(interval.start, range.start)) / 3_600_000
        const assignment = assignmentsById.get(interval.id)
        const order = assignment ? ordersById.get(assignment.orderId) : undefined
        if (order && assignment) entries.push({ order, assignment })
      }
    }

    const statusCounts = new Map<OrderStatus, number>()
    for (const { order } of entries) statusCounts.set(order.status, (statusCounts.get(order.status) ?? 0) + 1)

    const durationHours = selection.hourEnd - selection.hourStart

    return { entries, orders: entries.map((e) => e.order), machineHours: Math.round(machineHours), durationHours, statusCounts }
  }, [selection, range, machines, occupancyIndex, assignmentsById, ordersById])

  const closeAction = () => {
    setActionMode(null)
    setActionError(null)
  }

  const handleApplyShift = async (mode: 'move' | 'copy') => {
    if (!summary || summary.entries.length === 0) return
    setActionPending(true)
    setActionError(null)
    const deltaMs = shiftDays * DAY_MS

    const results = await Promise.allSettled(
      summary.entries.map(({ order, assignment }) => {
        const newStartAt = new Date(new Date(assignment.startAt).getTime() + deltaMs).toISOString()
        const newEndAt = new Date(new Date(assignment.endAt).getTime() + deltaMs).toISOString()
        if (mode === 'move') {
          return moveMutation.mutateAsync({ id: assignment.id, machineId: assignment.machineId, startAt: newStartAt, endAt: newEndAt })
        }
        return createMutation.mutateAsync({
          productId: order.productId,
          quantity: order.quantity,
          deadline: new Date(new Date(order.deadline).getTime() + deltaMs).toISOString(),
          priority: order.priority,
          machineId: assignment.machineId,
          startAt: newStartAt,
          endAt: newEndAt,
        })
      }),
    )

    setActionPending(false)
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      const reason = failed[0] as PromiseRejectedResult
      const message = reason.reason instanceof ApiError ? reason.reason.message : 'Не удалось выполнить операцию'
      setActionError(`${failed.length} из ${results.length} не выполнено: ${message}`)
    } else {
      closeAction()
      store.clearSelection()
    }
  }

  const handleDelete = async () => {
    if (!summary || summary.entries.length === 0) return
    setActionPending(true)
    setActionError(null)
    const results = await Promise.allSettled(summary.entries.map(({ order }) => deleteMutation.mutateAsync(order.id)))
    setActionPending(false)
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      setActionError(`${failed.length} из ${results.length} не удалено`)
    } else {
      closeAction()
      store.clearSelection()
    }
  }

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

      <div className="min-w-[210px]">
        <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Быстрые действия</p>
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="primary" onClick={onOpenBulkEdit} disabled={summary.orders.length === 0} className="justify-start">
            <Pencil className="h-3.5 w-3.5" />
            Массовое редактирование
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setActionMode(actionMode === 'move' ? null : 'move')}
            disabled={summary.orders.length === 0}
            title="Групповой перенос всего выделения. Перенос одного блока — перетаскиванием."
            className="justify-start"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Перенести
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setActionMode(actionMode === 'copy' ? null : 'copy')}
            disabled={summary.orders.length === 0}
            className="justify-start"
          >
            <Copy className="h-3.5 w-3.5" />
            Копировать
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setActionMode(actionMode === 'delete' ? null : 'delete')}
            disabled={summary.orders.length === 0}
            className="justify-start"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </Button>

          {(actionMode === 'move' || actionMode === 'copy') && (
            <div className="rounded-lg border border-[var(--color-border)] p-2">
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
                Сдвинуть на
                <input
                  type="number"
                  value={shiftDays}
                  onChange={(e) => setShiftDays(Number(e.target.value))}
                  className="h-7 w-14 rounded-md border border-[var(--color-border)] px-1.5 text-center text-xs"
                />
                дн.
              </label>
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" variant="primary" disabled={actionPending || shiftDays === 0} onClick={() => handleApplyShift(actionMode)} className="flex-1 justify-center">
                  {actionPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Применить
                </Button>
                <Button size="sm" variant="secondary" disabled={actionPending} onClick={closeAction}>
                  Отмена
                </Button>
              </div>
              {actionError && <p className="mt-1.5 text-xs text-red-600">{actionError}</p>}
            </div>
          )}

          {actionMode === 'delete' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2">
              <p className="text-xs font-medium text-red-700">Удалить {summary.orders.length} заказ(ов) безвозвратно?</p>
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" variant="danger" disabled={actionPending} onClick={handleDelete} className="flex-1 justify-center">
                  {actionPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Подтвердить
                </Button>
                <Button size="sm" variant="secondary" disabled={actionPending} onClick={closeAction}>
                  Отмена
                </Button>
              </div>
              {actionError && <p className="mt-1.5 text-xs text-red-600">{actionError}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Legend />
        <Minimap store={store} />
      </div>
    </div>
  )
})
