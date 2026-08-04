import { useMemo, useState } from 'react'
import { X, Download, Printer } from 'lucide-react'
import { format } from 'date-fns'
import type { Machine, DowntimeRule } from '@/entities/machine'
import type { Workshop } from '@/entities/workshop'
import type { Order, OrderPriority } from '@/entities/order'
import { priorityLabel } from '@/entities/order'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { startOfDay, formatDayHeading, DAY_MS } from '../lib/timeline'
import { Button } from '@/shared/ui/Button'
import { downloadCsv } from '@/shared/lib/csv'

interface ShiftExportDrawerProps {
  machines: Machine[]
  workshops: Workshop[]
  ordersById: Map<string, Order>
  downtimeByMachine: Map<string, DowntimeRule[]>
  defaultDate: Date
  onClose: () => void
}

interface ShiftRow {
  startAt: string
  endAt: string
  kind: 'order' | 'downtime'
  code?: string
  productName?: string
  quantity?: number
  priority?: OrderPriority
  reason?: string
}

/**
 * Печать/экспорт сменного задания — по станку(ам) на выбранную дату. Дата в этой шторке
 * независима от текущего окна матрицы (там окно запросов ±7 дней от anchorDate): здесь
 * свой запрос назначений ровно на выбранные сутки, чтобы работало для любой даты, а не
 * только для той, что сейчас проскроллена в шахматке.
 */
export function ShiftExportDrawer({ machines, workshops, ordersById, downtimeByMachine, defaultDate, onClose }: ShiftExportDrawerProps) {
  const [dateStr, setDateStr] = useState(() => format(defaultDate, 'yyyy-MM-dd'))
  const [machineFilter, setMachineFilter] = useState<'all' | string>('all')

  const dayStart = startOfDay(new Date(`${dateStr}T00:00:00`))
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)

  const assignmentsQuery = useAssignmentsWindowQuery(dayStart.toISOString(), dayEnd.toISOString())

  const workshopById = useMemo(() => new Map(workshops.map((w) => [w.id, w])), [workshops])

  const orderedMachines = useMemo(() => {
    const filtered = machineFilter === 'all' ? machines : machines.filter((m) => m.id === machineFilter)
    return [...filtered].sort((a, b) => {
      const wa = workshopById.get(a.workshopId)?.order ?? 0
      const wb = workshopById.get(b.workshopId)?.order ?? 0
      return wa !== wb ? wa - wb : a.order - b.order
    })
  }, [machines, machineFilter, workshopById])

  const rowsByMachine = useMemo(() => {
    const map = new Map<string, ShiftRow[]>()
    for (const machine of orderedMachines) {
      const rows: ShiftRow[] = []
      for (const a of assignmentsQuery.data ?? []) {
        if (a.machineId !== machine.id) continue
        const order = ordersById.get(a.orderId)
        rows.push({ startAt: a.startAt, endAt: a.endAt, kind: 'order', code: order?.code, productName: order?.productName, quantity: a.plannedQuantity, priority: order?.priority })
      }
      for (const r of downtimeByMachine.get(machine.id) ?? []) {
        const rStart = new Date(r.startAt).getTime()
        const rEnd = new Date(r.endAt).getTime()
        if (rStart < dayEnd.getTime() && rEnd > dayStart.getTime()) {
          rows.push({ startAt: r.startAt, endAt: r.endAt, kind: 'downtime', reason: r.reason })
        }
      }
      rows.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      map.set(machine.id, rows)
    }
    return map
    // dayStart/dayEnd меняются по ссылке каждый рендер — сравниваем по значению через getTime()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedMachines, assignmentsQuery.data, downtimeByMachine, ordersById, dayStart.getTime(), dayEnd.getTime()])

  const handleExportCsv = () => {
    const rows: string[][] = [['Станок', 'Начало', 'Окончание', 'Заказ', 'Продукт', 'Количество', 'Приоритет / причина']]
    for (const machine of orderedMachines) {
      for (const row of rowsByMachine.get(machine.id) ?? []) {
        rows.push([
          machine.name,
          format(new Date(row.startAt), 'HH:mm'),
          format(new Date(row.endAt), 'HH:mm'),
          row.code ?? '',
          row.productName ?? '',
          row.quantity != null ? String(row.quantity) : '',
          row.kind === 'downtime' ? `Простой: ${row.reason}` : row.priority ? priorityLabel(row.priority) : '',
        ])
      }
    }
    downloadCsv(`taktgrid-smena-${dateStr}.csv`, rows)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 print:hidden" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl print:max-w-none print:border-0 print:shadow-none">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 print:hidden">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Печать / экспорт сменного задания</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-5 py-3 print:hidden">
          <input
            type="date"
            aria-label="Дата смены"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="h-9 rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
          />
          <select
            aria-label="Станок"
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="h-9 rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
          >
            <option value="all">Все станки</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportCsv}>
              <Download className="h-3.5 w-3.5" />
              Экспорт в Excel
            </Button>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Печать
            </Button>
          </div>
        </div>

        <div className="print-area flex-1 overflow-y-auto p-5">
          <div className="mb-4 hidden print:block">
            <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Сменное задание — {formatDayHeading(dayStart)}</h1>
          </div>

          {assignmentsQuery.isLoading ? (
            <p className="text-sm text-[var(--color-ink-400)]">Загрузка…</p>
          ) : (
            <div className="space-y-6">
              {orderedMachines.map((machine) => {
                const rows = rowsByMachine.get(machine.id) ?? []
                return (
                  <div key={machine.id} className="break-inside-avoid">
                    <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink-900)]">
                      {machine.name}{' '}
                      <span className="font-normal text-[var(--color-ink-400)]">
                        · {workshopById.get(machine.workshopId)?.name ?? '—'} · {machine.groupName}
                      </span>
                    </h3>
                    {rows.length === 0 ? (
                      <p className="text-xs text-[var(--color-ink-400)]">Нет назначений на выбранную дату</p>
                    ) : (
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-600)]">
                            <th className="py-1.5 pr-3">Время</th>
                            <th className="py-1.5 pr-3">Заказ</th>
                            <th className="py-1.5 pr-3">Продукт</th>
                            <th className="py-1.5 pr-3 text-right">Кол-во</th>
                            <th className="py-1.5">Приоритет / причина</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                              <td className="py-1.5 pr-3 tabular-nums text-[var(--color-ink-600)]">
                                {format(new Date(row.startAt), 'HH:mm')}–{format(new Date(row.endAt), 'HH:mm')}
                              </td>
                              <td className="py-1.5 pr-3 font-medium text-[var(--color-ink-900)]">{row.code ?? '—'}</td>
                              <td className="py-1.5 pr-3 text-[var(--color-ink-600)]">{row.productName ?? '—'}</td>
                              <td className="py-1.5 pr-3 text-right tabular-nums text-[var(--color-ink-600)]">{row.quantity ?? '—'}</td>
                              <td className="py-1.5 text-[var(--color-ink-600)]">
                                {row.kind === 'downtime' ? `Простой: ${row.reason}` : row.priority ? priorityLabel(row.priority) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
              {orderedMachines.length === 0 && <p className="text-sm text-[var(--color-ink-400)]">Нет станков</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
