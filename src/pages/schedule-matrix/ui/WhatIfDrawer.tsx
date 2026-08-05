import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X, AlertTriangle, CheckCircle2, XCircle, Download, FlaskConical, Loader2 } from 'lucide-react'
import type { GridStore } from '../model/grid-store'
import { simulateMachineDowntime } from '../lib/simulate-downtime'
import { rankOrders } from '../lib/auto-schedule'
import { findSlotCandidates } from '../lib/slot-candidates'
import { HOUR_MS, DAY_MS, dateToHourIndex } from '../lib/timeline'
import { useOrdersQuery, priorityLabel, type OrderPriority } from '@/entities/order'
import type { Machine, DowntimeRule } from '@/entities/machine'
import type { Product } from '@/entities/product'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import { usePlanningSettingsStore } from '@/entities/setting'
import { Button } from '@/shared/ui/Button'
import { downloadCsv } from '@/shared/lib/csv'

const PRIORITIES: OrderPriority[] = ['low', 'normal', 'high', 'critical']
const SCENARIOS = [
  { id: 'downtime', label: 'Станок выйдет из строя' },
  { id: 'priority', label: 'Изменить приоритет/дедлайн' },
] as const
type ScenarioId = (typeof SCENARIOS)[number]['id']

interface WhatIfDrawerProps {
  store: GridStore
  machines: Machine[]
  products: Product[]
  downtimeByMachine: Map<string, DowntimeRule[]>
  onClose: () => void
}

export function WhatIfDrawer({ store, machines, products, downtimeByMachine, onClose }: WhatIfDrawerProps) {
  const [scenario, setScenario] = useState<ScenarioId>('downtime')
  const planningSettings = usePlanningSettingsStore()

  // --- Сценарий А: простой станка ---
  const [machineId, setMachineId] = useState(machines[0]?.id ?? '')
  const [dateStr, setDateStr] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [startHour, setStartHour] = useState(8)
  const [durationHours, setDurationHours] = useState(8)

  const downtimeStart = new Date(`${dateStr}T00:00:00`)
  downtimeStart.setHours(startHour, 0, 0, 0)
  const downtimeStartMs = downtimeStart.getTime()
  const downtimeEndMs = downtimeStartMs + durationHours * HOUR_MS

  const downtimeAssignmentsQuery = useAssignmentsWindowQuery(new Date(downtimeStartMs).toISOString(), new Date(downtimeEndMs).toISOString(), scenario === 'downtime')
  const allOrdersQuery = useOrdersQuery({ limit: 30000 })

  const downtimeResult = useMemo(() => {
    if (scenario !== 'downtime' || !machineId) return null
    return simulateMachineDowntime(downtimeAssignmentsQuery.data ?? [], allOrdersQuery.data ?? [], machineId, downtimeStartMs, downtimeEndMs)
    // downtimeStartMs/downtimeEndMs — примитивы, безопасно сравнивать по значению
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, machineId, downtimeAssignmentsQuery.data, allOrdersQuery.data, downtimeStartMs, downtimeEndMs])

  const handleExportCsv = () => {
    if (!downtimeResult) return
    const rows: string[][] = [['Заказ', 'Начало', 'Окончание', 'Новый статус']]
    for (const a of downtimeResult.affected) {
      rows.push([a.orderCode, format(new Date(a.startAt), 'dd.MM.yyyy HH:mm'), format(new Date(a.endAt), 'dd.MM.yyyy HH:mm'), 'Нуждается в переназначении'])
    }
    downloadCsv(`taktgrid-whatif-downtime-${dateStr}.csv`, rows)
  }

  // --- Сценарий Б: приоритет/дедлайн ---
  const needsReassignmentQuery = useOrdersQuery({ status: 'needs_reassignment' })
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [newPriority, setNewPriority] = useState<OrderPriority>('normal')
  const [newDeadlineStr, setNewDeadlineStr] = useState('')

  useEffect(() => {
    const first = needsReassignmentQuery.data?.[0]
    if (first && !selectedOrderId) {
      setSelectedOrderId(first.id)
      setNewPriority(first.priority)
      setNewDeadlineStr(format(new Date(first.deadline), 'yyyy-MM-dd'))
    }
  }, [needsReassignmentQuery.data, selectedOrderId])

  const now = useMemo(() => new Date(), [])
  const horizonMs = planningSettings.orderHorizonDays * DAY_MS
  const priorityAssignmentsQuery = useAssignmentsWindowQuery(now.toISOString(), new Date(now.getTime() + horizonMs).toISOString(), scenario === 'priority')

  const priorityResult = useMemo(() => {
    if (scenario !== 'priority' || !selectedOrderId) return null
    const queue = needsReassignmentQuery.data ?? []
    const order = queue.find((o) => o.id === selectedOrderId)
    if (!order) return null

    const product = products.find((p) => p.id === order.productId)
    const before = rankOrders(queue, planningSettings.schedulingAlgorithm, planningSettings.priorityWeights)
    const positionBefore = before.findIndex((o) => o.id === order.id)

    const modifiedOrder = { ...order, priority: newPriority, deadline: newDeadlineStr ? new Date(`${newDeadlineStr}T23:59:59`).toISOString() : order.deadline }
    const modifiedQueue = queue.map((o) => (o.id === order.id ? modifiedOrder : o))
    const after = rankOrders(modifiedQueue, planningSettings.schedulingAlgorithm, planningSettings.priorityWeights)
    const positionAfter = after.findIndex((o) => o.id === order.id)

    let candidate = null
    if (product) {
      const groupMachines = machines.filter((m) => m.groupId === product.techMap.machineGroupId)
      const requiredMs = Math.ceil(order.quantity / product.techMap.outputPerHour) * HOUR_MS
      const occupancyIndex = new OccupancyIndex(priorityAssignmentsQuery.data ?? [])
      const candidates = findSlotCandidates({
        groupMachines,
        occupancyIndex,
        downtimeByMachine,
        searchStart: now.getTime(),
        searchEnd: now.getTime() + horizonMs,
        requiredMs,
        deadlineMs: new Date(modifiedOrder.deadline).getTime(),
        limit: 1,
      })
      candidate = candidates[0] ?? null
    }

    return { order, positionBefore, positionAfter, total: queue.length, candidate }
    // deadline-строки сравниваем по значению уже внутри modifiedOrder — доп. зависимости не нужны
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, selectedOrderId, needsReassignmentQuery.data, newPriority, newDeadlineStr, products, machines, planningSettings, priorityAssignmentsQuery.data, downtimeByMachine, now, horizonMs])

  useEffect(() => {
    if (!priorityResult?.candidate) {
      store.setPreviewGhost(null)
      return
    }
    const c = priorityResult.candidate
    store.setPreviewGhost({ machineId: c.machine.id, hourStart: dateToHourIndex(store.epochMs, new Date(c.start)), durationHours: Math.round((c.end - c.start) / HOUR_MS), label: priorityResult.order.code })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityResult?.candidate, store])

  useEffect(() => () => store.setPreviewGhost(null), [store])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-[var(--color-ink-900)]">
            <FlaskConical className="h-4 w-4 text-[var(--color-brand-600)]" />
            Что если…
          </h2>
          <button onClick={onClose} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-[var(--color-border)] px-5 py-2.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                scenario === s.id ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-canvas)] text-[var(--color-ink-600)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {scenario === 'downtime' ? (
            <>
              <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-ink-600)]">
                Ничего не меняется по-настоящему — только предпросмотр, какие заказы снялись бы с графика. Если решите, что сценарий реален, добавьте простой на странице «Станки».
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                  Станок
                  <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm">
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                  Дата
                  <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm" />
                </label>
                <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                  Начало, час
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                  Длительность, ч
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
                  />
                </label>
              </div>

              {downtimeAssignmentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8 text-[var(--color-ink-400)]">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : downtimeResult && downtimeResult.affected.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-priority-critical)]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Снимется с графика: {downtimeResult.affected.length}
                    </p>
                    <Button size="sm" variant="secondary" onClick={handleExportCsv}>
                      <Download className="h-3.5 w-3.5" />
                      Экспорт CSV
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {downtimeResult.affected.map((a) => (
                      <div key={a.assignmentId} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs">
                        <p className="font-medium text-[var(--color-ink-900)]">{a.orderCode}</p>
                        <p className="text-[var(--color-ink-600)]">
                          {format(new Date(a.startAt), 'd MMM, HH:mm', { locale: ru })} – {format(new Date(a.endAt), 'HH:mm', { locale: ru })} → нуждается в переназначении
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-priority-low)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  На это окно на станке ничего не назначено — простой ни на что не повлияет
                </p>
              )}
            </>
          ) : (
            <>
              <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-ink-600)]">
                Изменение приоритета само по себе ничего не переносит на графике — этот сценарий показывает, как заказ повёл бы себя в очереди авто-расстановки (см. Настройки → Планирование).
              </p>
              {needsReassignmentQuery.data && needsReassignmentQuery.data.length > 0 ? (
                <>
                  <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
                    Заказ (из очереди "нуждается в переназначении")
                    <select
                      value={selectedOrderId ?? ''}
                      onChange={(e) => {
                        setSelectedOrderId(e.target.value)
                        const order = needsReassignmentQuery.data?.find((o) => o.id === e.target.value)
                        if (order) {
                          setNewPriority(order.priority)
                          setNewDeadlineStr(format(new Date(order.deadline), 'yyyy-MM-dd'))
                        }
                      }}
                      className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
                    >
                      {needsReassignmentQuery.data.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.code} — {o.productName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                      Новый приоритет
                      <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as OrderPriority)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm">
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {priorityLabel(p)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                      Новый дедлайн
                      <input type="date" value={newDeadlineStr} onChange={(e) => setNewDeadlineStr(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm" />
                    </label>
                  </div>

                  {priorityResult && (
                    <div className="space-y-2 rounded-lg border border-[var(--color-border)] p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-ink-600)]">Позиция в очереди</span>
                        <span className="font-medium text-[var(--color-ink-900)]">
                          #{priorityResult.positionBefore + 1} → #{priorityResult.positionAfter + 1} из {priorityResult.total}
                        </span>
                      </div>
                      {priorityResult.candidate ? (
                        <p className={`flex items-center gap-1.5 font-medium ${priorityResult.candidate.fitsDeadline ? 'text-[var(--color-priority-low)]' : 'text-[var(--color-priority-high)]'}`}>
                          {priorityResult.candidate.fitsDeadline ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                          Слот нашёлся бы: {priorityResult.candidate.machine.name}, {format(new Date(priorityResult.candidate.start), 'd MMM, HH:mm', { locale: ru })}
                          {!priorityResult.candidate.fitsDeadline && ' (позже нового дедлайна)'}
                        </p>
                      ) : (
                        <p className="flex items-center gap-1.5 font-medium text-[var(--color-priority-critical)]">
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          Слот не нашёлся бы в горизонте планирования
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--color-ink-400)]">Нет заказов, нуждающихся в переназначении</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
