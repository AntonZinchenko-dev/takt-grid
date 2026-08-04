import { useEffect, useMemo, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Order } from '@/entities/order'
import { priorityLabel, priorityColorVar, priorityBgVar } from '@/entities/order'
import { useCreateAssignmentMutation, useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import type { Machine, DowntimeRule } from '@/entities/machine'
import type { Product } from '@/entities/product'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import type { GridStore } from '../../model/grid-store'
import { findSlotCandidates, type SlotCandidate } from '../../lib/slot-candidates'
import { DAY_MS, HOUR_MS, dateToHourIndex } from '../../lib/timeline'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { cn } from '@/shared/lib/cn'

const SEARCH_HORIZON_DAYS = 120

interface ReassignOrderWizardProps {
  store: GridStore
  order: Order
  products: Product[]
  machines: Machine[]
  downtimeByMachine: Map<string, DowntimeRule[]>
  onClose: () => void
}

/**
 * Мини-мастер переназначения заказа, снятого с графика (простой/ТО или смена группы
 * станка). В отличие от OrderWizard, продукт/количество/дедлайн уже зафиксированы
 * заказом — здесь только поиск нового станка/времени, как в резолвере конфликтов
 * OrderDetailDrawer, но без существующего assignment (создаём новый, а не переносим).
 */
export function ReassignOrderWizard({ store, order, products, machines, downtimeByMachine, onClose }: ReassignOrderWizardProps) {
  const now = useMemo(() => new Date(), [])
  const product = products.find((p) => p.id === order.productId)
  const techMap = product?.techMap
  const groupMachines = useMemo(() => (techMap ? machines.filter((m) => m.groupId === techMap.machineGroupId) : []), [techMap, machines])

  const deadlineDate = new Date(order.deadline)
  const requiredHours = techMap ? Math.ceil(order.quantity / techMap.outputPerHour) : 0
  const requiredMs = requiredHours * HOUR_MS
  const searchEndMs = Math.min(deadlineDate.getTime() + 2 * DAY_MS, now.getTime() + SEARCH_HORIZON_DAYS * DAY_MS)

  const searchFromIso = now.toISOString()
  const searchToIso = new Date(Math.max(searchEndMs, now.getTime() + DAY_MS)).toISOString()
  const assignmentsQuery = useAssignmentsWindowQuery(searchFromIso, searchToIso)
  const occupancyIndex = useMemo(() => new OccupancyIndex(assignmentsQuery.data ?? []), [assignmentsQuery.data])

  const candidates = useMemo<SlotCandidate[]>(() => {
    if (!techMap || requiredMs <= 0) return []
    return findSlotCandidates({
      groupMachines,
      occupancyIndex,
      downtimeByMachine,
      searchStart: now.getTime(),
      searchEnd: Math.max(searchEndMs, now.getTime() + DAY_MS),
      requiredMs,
      deadlineMs: deadlineDate.getTime(),
    })
    // deadlineDate меняется по ссылке каждый рендер — сравниваем по значению через getTime()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techMap, requiredMs, groupMachines, occupancyIndex, downtimeByMachine, now, searchEndMs, deadlineDate.getTime()])

  const [selectedIndex, setSelectedIndex] = useState(0)
  const clampedIndex = candidates.length > 0 ? Math.min(selectedIndex, candidates.length - 1) : 0
  const selectedCandidate = candidates[clampedIndex] ?? null

  const showCandidate = (candidate: SlotCandidate) => {
    store.setPreviewGhost({
      machineId: candidate.machine.id,
      hourStart: dateToHourIndex(store.epochMs, new Date(candidate.start)),
      durationHours: requiredHours,
      label: order.productName,
    })
  }

  useEffect(() => {
    if (!selectedCandidate) {
      store.setPreviewGhost(null)
      return
    }
    showCandidate(selectedCandidate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCandidate, store])

  useEffect(() => () => store.setPreviewGhost(null), [store])

  const createMutation = useCreateAssignmentMutation()

  const handleApply = () => {
    if (!selectedCandidate) return
    createMutation.mutate(
      {
        orderId: order.id,
        machineId: selectedCandidate.machine.id,
        startAt: new Date(selectedCandidate.start).toISOString(),
        endAt: new Date(selectedCandidate.end).toISOString(),
        plannedQuantity: order.quantity,
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

  const feasibility: { icon: typeof CheckCircle2; color: string; bg: string; text: string } | null = !techMap
    ? { icon: XCircle, color: 'var(--color-priority-critical)', bg: 'var(--color-priority-critical-bg)', text: 'Продукт заказа не найден в каталоге' }
    : candidates.length === 0
      ? {
          icon: XCircle,
          color: 'var(--color-priority-critical)',
          bg: 'var(--color-priority-critical-bg)',
          text: `Не удаётся найти окно на ${SEARCH_HORIZON_DAYS} дней вперёд ни на одном станке группы «${groupMachines[0]?.groupName ?? ''}»`,
        }
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
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Назначить: {order.code}</h2>
            <p className="text-xs text-[var(--color-ink-600)]">{order.productName}</p>
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={priorityColorVar(order.priority)} bg={priorityBgVar(order.priority)}>
              {priorityLabel(order.priority)}
            </Badge>
            <span className="text-xs text-[var(--color-ink-600)]">Дедлайн {format(deadlineDate, 'd MMM yyyy, HH:mm', { locale: ru })}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs">
            <div>
              <p className="text-[var(--color-ink-400)]">Количество</p>
              <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{order.quantity} шт</p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Группа станков</p>
              <p className="font-medium text-[var(--color-ink-900)]">{groupMachines[0]?.groupName ?? '—'}</p>
            </div>
            {techMap && requiredHours > 0 && (
              <div className="col-span-2">
                <p className="text-[var(--color-ink-400)]">Требуется машино-часов</p>
                <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{requiredHours} ч</p>
              </div>
            )}
          </div>

          {feasibility && (
            <div className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium" style={{ borderColor: feasibility.color, backgroundColor: feasibility.bg, color: feasibility.color }}>
              <feasibility.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{feasibility.text}</span>
            </div>
          )}

          {candidates.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Рекомендуемые слоты</p>
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
            </div>
          )}

          {createMutation.isError && <p className="text-xs font-medium text-red-600">Не удалось назначить — возможно, слот уже заняли. Попробуйте другой вариант.</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={createMutation.isPending}>
            Отмена
          </Button>
          <Button type="button" variant="primary" disabled={!selectedCandidate || createMutation.isPending} onClick={handleApply}>
            {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Назначить на выбранный слот
          </Button>
        </div>
      </div>
    </div>
  )
}
