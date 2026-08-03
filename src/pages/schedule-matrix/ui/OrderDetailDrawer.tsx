import { useEffect, useMemo, useState } from 'react'
import { X, Search, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Order } from '@/entities/order'
import { priorityLabel, priorityColorVar, priorityBgVar, statusLabel } from '@/entities/order'
import {
  useMoveAssignmentMutation,
  useUpdateAssignmentResultMutation,
  useAssignmentsWindowQuery,
  type ScheduleAssignment,
} from '@/entities/schedule-assignment'
import type { Machine, DowntimeRule } from '@/entities/machine'
import type { Product } from '@/entities/product'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import type { GridStore } from '../model/grid-store'
import { findSlotCandidates, type SlotCandidate } from '../lib/slot-candidates'
import { DAY_MS, dateToHourIndex } from '../lib/timeline'
import { cn } from '@/shared/lib/cn'

const SEARCH_HORIZON_DAYS = 120

const STATUS_DOT: Record<Order['status'], string> = {
  planned: 'var(--color-priority-normal)',
  in_progress: 'var(--color-priority-low)',
  at_risk: 'var(--color-priority-high)',
  overdue: 'var(--color-priority-critical)',
  done: 'var(--color-priority-done)',
}

interface OrderDetailDrawerProps {
  store: GridStore
  order: Order
  assignment: ScheduleAssignment
  machine: Machine
  workshopName: string
  machines: Machine[]
  products: Product[]
  downtimeByMachine: Map<string, DowntimeRule[]>
  /** Открыт из вкладки "Конфликты" — сразу разворачиваем поиск нового слота. */
  autoResolve?: boolean
  conflictReason?: string
  onClose: () => void
}

export function OrderDetailDrawer({
  store,
  order,
  assignment,
  machine,
  workshopName,
  machines,
  products,
  downtimeByMachine,
  autoResolve = false,
  conflictReason,
  onClose,
}: OrderDetailDrawerProps) {
  const durationHours = Math.round((new Date(assignment.endAt).getTime() - new Date(assignment.startAt).getTime()) / 3_600_000)
  const [resolveOpen, setResolveOpen] = useState(autoResolve)

  const resultMutation = useUpdateAssignmentResultMutation()
  const [resultInput, setResultInput] = useState(assignment.actualQuantity !== undefined ? String(assignment.actualQuantity) : '')
  useEffect(() => {
    setResultInput(assignment.actualQuantity !== undefined ? String(assignment.actualQuantity) : '')
  }, [assignment.id, assignment.actualQuantity])

  const parsedResult = resultInput.trim() === '' ? null : Number(resultInput)
  const resultIsValid = parsedResult !== null && !Number.isNaN(parsedResult) && parsedResult >= 0 && parsedResult <= assignment.plannedQuantity
  const resultPercent = resultIsValid && assignment.plannedQuantity > 0 ? Math.round((parsedResult / assignment.plannedQuantity) * 100) : null

  const handleResultChange = (raw: string) => {
    if (raw.trim() === '') {
      setResultInput('')
      return
    }
    const num = Number(raw)
    if (Number.isNaN(num)) return
    setResultInput(String(Math.min(Math.max(num, 0), assignment.plannedQuantity)))
  }

  const handleSaveResult = () => {
    if (!resultIsValid) return
    resultMutation.mutate({ id: assignment.id, actualQuantity: parsedResult })
  }

  const now = useMemo(() => new Date(), [])
  const product = products.find((p) => p.id === order.productId)
  const techMap = product?.techMap
  const groupMachines = useMemo(
    () => (techMap ? machines.filter((m) => m.groupId === techMap.machineGroupId) : [machine]),
    [techMap, machines, machine],
  )

  const deadlineDate = new Date(order.deadline)
  const requiredMs = new Date(assignment.endAt).getTime() - new Date(assignment.startAt).getTime()
  const searchEndMs = Math.min(deadlineDate.getTime() + 2 * DAY_MS, now.getTime() + SEARCH_HORIZON_DAYS * DAY_MS)

  const searchFromIso = now.toISOString()
  const searchToIso = new Date(Math.max(searchEndMs, now.getTime() + DAY_MS)).toISOString()
  const assignmentsQuery = useAssignmentsWindowQuery(searchFromIso, searchToIso, resolveOpen)
  const occupancyIndex = useMemo(() => new OccupancyIndex(assignmentsQuery.data ?? []), [assignmentsQuery.data])

  const candidates = useMemo<SlotCandidate[]>(() => {
    if (!resolveOpen || requiredMs <= 0) return []
    return findSlotCandidates({
      groupMachines,
      occupancyIndex,
      downtimeByMachine,
      searchStart: now.getTime(),
      searchEnd: Math.max(searchEndMs, now.getTime() + DAY_MS),
      requiredMs,
      deadlineMs: deadlineDate.getTime(),
      excludeAssignmentId: assignment.id,
    })
    // deadlineDate меняется по ссылке каждый рендер — сравниваем по значению через getTime()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveOpen, requiredMs, groupMachines, occupancyIndex, downtimeByMachine, now, searchEndMs, deadlineDate.getTime(), assignment.id])

  const [selectedIndex, setSelectedIndex] = useState(0)
  useEffect(() => setSelectedIndex(0), [assignment.id])
  const clampedIndex = candidates.length > 0 ? Math.min(selectedIndex, candidates.length - 1) : 0
  const selectedCandidate = candidates[clampedIndex] ?? null

  const showCandidate = (candidate: SlotCandidate) => {
    store.setPreviewGhost({ machineId: candidate.machine.id, hourStart: dateToHourIndex(store.epochMs, new Date(candidate.start)), durationHours, label: order.productName })
  }

  useEffect(() => {
    if (!resolveOpen || !selectedCandidate) {
      store.setPreviewGhost(null)
      return
    }
    showCandidate(selectedCandidate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveOpen, selectedCandidate, store])

  useEffect(() => () => store.setPreviewGhost(null), [store])

  const moveMutation = useMoveAssignmentMutation()

  const handleApplyMove = () => {
    if (!selectedCandidate) return
    moveMutation.mutate(
      {
        id: assignment.id,
        machineId: selectedCandidate.machine.id,
        startAt: new Date(selectedCandidate.start).toISOString(),
        endAt: new Date(selectedCandidate.end).toISOString(),
      },
      {
        onSuccess: () => {
          store.setPreviewGhost(null)
          store.jumpToDate(new Date(selectedCandidate.start))
          onClose()
        },
      },
    )
  }

  const feasibility: { icon: typeof CheckCircle2; color: string; bg: string; text: string } | null = !resolveOpen
    ? null
    : candidates.length === 0
      ? { icon: XCircle, color: 'var(--color-priority-critical)', bg: 'var(--color-priority-critical-bg)', text: `Не удаётся найти окно на ${SEARCH_HORIZON_DAYS} дней вперёд ни на одном станке группы «${groupMachines[0]?.groupName ?? ''}»` }
      : selectedCandidate?.fitsDeadline
        ? { icon: CheckCircle2, color: 'var(--color-priority-low)', bg: 'var(--color-priority-low-bg)', text: 'Укладывается в срок' }
        : {
            icon: AlertTriangle,
            color: 'var(--color-priority-high)',
            bg: 'var(--color-priority-high-bg)',
            text: `Не укладывается в дедлайн — ближайший реалистичный вариант: ${selectedCandidate ? format(new Date(selectedCandidate.end), 'd MMMM, HH:mm', { locale: ru }) : ''}`,
          }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{order.code}</h2>
            <p className="text-xs text-[var(--color-ink-600)]">{order.productName}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {conflictReason && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--color-priority-critical)] bg-[var(--color-priority-critical-bg)] px-3 py-2 text-xs font-medium text-[var(--color-priority-critical)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Конфликт: пересекается с «{conflictReason}». Подберите новое время ниже.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge color={priorityColorVar(order.priority)} bg={priorityBgVar(order.priority)}>
              {priorityLabel(order.priority)}
            </Badge>
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-600)]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_DOT[order.status] }} />
              {statusLabel(order.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs">
            <div>
              <p className="text-[var(--color-ink-400)]">Количество</p>
              <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{order.quantity} шт</p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Дедлайн</p>
              <p className="font-medium text-[var(--color-ink-900)]">{format(new Date(order.deadline), 'd MMM yyyy, HH:mm', { locale: ru })}</p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Станок</p>
              <p className="font-medium text-[var(--color-ink-900)]">{machine.name}</p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Цех / линия</p>
              <p className="font-medium text-[var(--color-ink-900)]">
                {workshopName} · {machine.groupName}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Назначение в графике</p>
            <div className="space-y-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-ink-600)]">Начало</span>
                <span className="font-medium text-[var(--color-ink-900)]">{format(new Date(assignment.startAt), 'd MMM, HH:mm', { locale: ru })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-ink-600)]">Окончание</span>
                <span className="font-medium text-[var(--color-ink-900)]">{format(new Date(assignment.endAt), 'd MMM, HH:mm', { locale: ru })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-ink-600)]">Длительность</span>
                <span className="font-medium text-[var(--color-ink-900)]">{durationHours} ч</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-ink-600)]">Плановое количество</span>
                <span className="font-medium text-[var(--color-ink-900)]">{assignment.plannedQuantity} шт</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Результат</p>
            <div className="space-y-2 rounded-lg border border-[var(--color-border)] px-3 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={assignment.plannedQuantity}
                  value={resultInput}
                  onChange={(e) => handleResultChange(e.target.value)}
                  placeholder="Факт, шт"
                  className="h-9 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
                />
                <Button type="button" variant="secondary" size="sm" disabled={!resultIsValid || resultMutation.isPending} onClick={handleSaveResult}>
                  {resultMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Сохранить
                </Button>
              </div>
              <p className="text-[11px] text-[var(--color-ink-400)]">Не больше планового количества — {assignment.plannedQuantity} шт</p>

              {resultPercent !== null && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-ink-600)]">
                    <span>Готовность плана</span>
                    <span className="font-semibold tabular-nums text-[var(--color-ink-900)]">{resultPercent}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-canvas)]">
                    <div className="h-full rounded-full transition-[width]" style={{ width: `${resultPercent}%`, backgroundColor: priorityColorVar(order.priority) }} />
                  </div>
                </div>
              )}

              {resultMutation.isError && <p className="text-xs font-medium text-red-600">Не удалось сохранить результат. Попробуйте ещё раз.</p>}
            </div>
          </div>

          {!resolveOpen && (
            <Button type="button" variant="secondary" onClick={() => setResolveOpen(true)} className="w-full justify-center">
              <Search className="h-3.5 w-3.5" />
              Найти новое время
            </Button>
          )}

          {resolveOpen && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--color-ink-900)]">Куда перенести</p>
                <button type="button" onClick={() => setResolveOpen(false)} className="text-xs font-medium text-[var(--color-brand-600)] hover:underline">
                  Скрыть
                </button>
              </div>

              {assignmentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-6 text-[var(--color-ink-400)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  {feasibility && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium" style={{ borderColor: feasibility.color, backgroundColor: feasibility.bg, color: feasibility.color }}>
                      <feasibility.icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{feasibility.text}</span>
                    </div>
                  )}

                  {candidates.length > 0 && (
                    <div className="space-y-1.5">
                      {candidates.map((c, i) => (
                        <button
                          type="button"
                          key={`${c.machine.id}-${c.start}`}
                          onClick={() => setSelectedIndex(i)}
                          onMouseEnter={() => showCandidate(c)}
                          onMouseLeave={() => selectedCandidate && showCandidate(selectedCandidate)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                            i === clampedIndex ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border)] hover:bg-[var(--color-canvas)]',
                          )}
                        >
                          <span>
                            <span className="block font-medium text-[var(--color-ink-900)]">{c.machine.name}</span>
                            <span className="text-[var(--color-ink-600)]">
                              {format(new Date(c.start), 'd MMM, HH:mm', { locale: ru })} – {format(new Date(c.end), 'HH:mm', { locale: ru })}
                            </span>
                          </span>
                          {!c.fitsDeadline && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--color-priority-high)]" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {moveMutation.isError && <p className="mt-2 text-xs font-medium text-red-600">Не удалось перенести — возможно, слот уже заняли. Попробуйте другой вариант.</p>}

                  <Button
                    type="button"
                    variant="primary"
                    disabled={!selectedCandidate || moveMutation.isPending}
                    onClick={handleApplyMove}
                    className="mt-2 w-full justify-center"
                  >
                    {moveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Перенести на выбранный слот
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
