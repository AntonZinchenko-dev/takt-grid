import { useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { X, Loader2 } from 'lucide-react'
import type { GridStore } from '../model/grid-store'
import { applyBulkFormula, type BulkEditMode } from '../lib/bulk-formula'
import type { OccupancyIndex } from '@/shared/lib/occupancy-index'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import { useBulkUpdateAssignmentsMutation } from '@/entities/schedule-assignment'
import type { Order } from '@/entities/order'
import type { Product } from '@/entities/product'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

interface BulkEditPanelProps {
  store: GridStore
  occupancyIndex: OccupancyIndex
  assignmentsById: Map<string, ScheduleAssignment>
  ordersById: Map<string, Order>
  productsById: Map<string, Product>
  onClose: () => void
}

interface AffectedRow {
  assignmentId: string
  orderCode: string
  machineName: string
  currentQuantity: number
  packageMultiplicity: number
}

const PREVIEW_LIMIT = 20

export const BulkEditPanel = observer(function BulkEditPanel({
  store,
  occupancyIndex,
  assignmentsById,
  ordersById,
  productsById,
  onClose,
}: BulkEditPanelProps) {
  const [mode, setMode] = useState<BulkEditMode>('relative')
  const [value, setValue] = useState(15)
  const [roundToMultiplicity, setRoundToMultiplicity] = useState(true)
  const bulkMutation = useBulkUpdateAssignmentsMutation()

  const range = store.selectionRangeMs
  const machines = store.selectedMachines

  const affected = useMemo<AffectedRow[]>(() => {
    if (!range) return []
    const rows: AffectedRow[] = []
    for (const machine of machines) {
      for (const interval of occupancyIndex.findOverlapping(machine.id, range.start, range.end)) {
        const assignment = assignmentsById.get(interval.id)
        if (!assignment) continue
        const order = ordersById.get(assignment.orderId)
        const product = order ? productsById.get(order.productId) : undefined
        rows.push({
          assignmentId: assignment.id,
          orderCode: order?.code ?? assignment.orderId,
          machineName: machine.name,
          currentQuantity: assignment.plannedQuantity,
          packageMultiplicity: product?.techMap.packageMultiplicity ?? 1,
        })
      }
    }
    return rows
  }, [range, machines, occupancyIndex, assignmentsById, ordersById, productsById])

  const params = { mode, value, roundToMultiplicity }

  const handleApply = () => {
    const updates = affected.map((row) => ({
      id: row.assignmentId,
      plannedQuantity: applyBulkFormula({ currentQuantity: row.currentQuantity, packageMultiplicity: row.packageMultiplicity }, params),
    }))
    bulkMutation.mutate(
      { updates },
      {
        onSuccess: () => {
          store.clearSelection()
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Массовое редактирование</h2>
            <p className="text-xs text-[var(--color-ink-600)]">
              Затронуто {affected.length} {pluralizeCells(affected.length)} на {machines.length} {pluralizeMachines(machines.length)}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Тип операции</p>
          <div className="mb-4 flex overflow-hidden rounded-lg border border-[var(--color-border)]">
            {(
              [
                ['relative', 'Относительное, %'],
                ['absolute', 'Абсолютное значение'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 px-3 py-1.5 text-xs font-medium transition-colors',
                  mode === m ? 'bg-[var(--color-brand-600)] text-white' : 'bg-white text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <label htmlFor="bulk-edit-value" className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">
            {mode === 'relative' ? 'Изменение, %' : 'Новое количество, шт.'}
          </label>
          <input
            id="bulk-edit-value"
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="mb-3 h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
          />

          <label className="mb-4 flex items-center gap-2 text-sm text-[var(--color-ink-900)]">
            <input type="checkbox" checked={roundToMultiplicity} onChange={(e) => setRoundToMultiplicity(e.target.checked)} className="h-4 w-4 rounded border-[var(--color-border)]" />
            Округлять до кратности упаковки продукта
          </label>

          <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Предпросмотр: было → станет</p>
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-canvas)] text-[var(--color-ink-600)]">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Заказ</th>
                  <th className="px-2 py-1.5 text-left font-medium">Станок</th>
                  <th className="px-2 py-1.5 text-right font-medium">Было</th>
                  <th className="px-2 py-1.5 text-right font-medium">Станет</th>
                </tr>
              </thead>
              <tbody>
                {affected.slice(0, PREVIEW_LIMIT).map((row) => {
                  const next = applyBulkFormula({ currentQuantity: row.currentQuantity, packageMultiplicity: row.packageMultiplicity }, params)
                  const changed = next !== row.currentQuantity
                  return (
                    <tr key={row.assignmentId} className="border-t border-[var(--color-border)]">
                      <td className="px-2 py-1.5 font-medium text-[var(--color-ink-900)]">{row.orderCode}</td>
                      <td className="truncate px-2 py-1.5 text-[var(--color-ink-600)]">{row.machineName}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-[var(--color-ink-600)]">{row.currentQuantity}</td>
                      <td className={cn('px-2 py-1.5 text-right font-semibold tabular-nums', changed ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink-400)]')}>
                        {next}
                      </td>
                    </tr>
                  )
                })}
                {affected.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-center text-[var(--color-ink-400)]">
                      В выделении нет заказов
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {affected.length > PREVIEW_LIMIT && (
              <p className="border-t border-[var(--color-border)] px-2 py-1.5 text-[11px] text-[var(--color-ink-400)]">
                И ещё {affected.length - PREVIEW_LIMIT} {pluralizeCells(affected.length - PREVIEW_LIMIT)}
              </p>
            )}
          </div>

          {bulkMutation.isError && <p className="mt-3 text-xs font-medium text-red-600">Не удалось применить изменения. Попробуйте ещё раз.</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={bulkMutation.isPending}>
            Отмена
          </Button>
          <Button variant="primary" onClick={handleApply} disabled={affected.length === 0 || bulkMutation.isPending}>
            {bulkMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Применить к {affected.length} {pluralizeCells(affected.length)}
          </Button>
        </div>
      </div>
    </div>
  )
})

function pluralizeCells(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'заказу'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'заказам'
  return 'заказам'
}

function pluralizeMachines(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'станке'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'станках'
  return 'станках'
}
