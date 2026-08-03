import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { GridStore } from '../../model/grid-store'
import { findFirstAvailableSlot } from '../../lib/slot-search'
import { HOUR_MS, DAY_MS, dateToHourIndex } from '../../lib/timeline'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import type { Machine } from '@/entities/machine'
import type { Product } from '@/entities/product'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { useCreateOrderMutation, priorityLabel, type OrderPriority } from '@/entities/order'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'

const orderFormSchema = z.object({
  productId: z.string().min(1, 'Выберите продукт'),
  quantity: z.number().positive('Количество должно быть больше нуля'),
  deadline: z.string().min(1, 'Укажите срок'),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
})
type OrderFormValues = z.infer<typeof orderFormSchema>

const PRIORITIES: OrderPriority[] = ['low', 'normal', 'high', 'critical']
const SEARCH_HORIZON_DAYS = 120

interface Candidate {
  machine: Machine
  start: number
  end: number
  fitsDeadline: boolean
}

interface OrderWizardProps {
  store: GridStore
  products: Product[]
  machines: Machine[]
  onClose: () => void
}

export const OrderWizard = observer(function OrderWizard({ store, products, machines, onClose }: OrderWizardProps) {
  const now = useMemo(() => new Date(), [])
  const defaultDeadline = useMemo(() => format(new Date(now.getTime() + 7 * DAY_MS), 'yyyy-MM-dd'), [now])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: { productId: '', quantity: 100, deadline: defaultDeadline, priority: 'normal' },
  })

  const productId = watch('productId')
  const quantityRaw = watch('quantity')
  const deadlineRaw = watch('deadline')

  // Тяжёлая часть (поиск слотов по всем станкам группы) не должна тормозить набор текста —
  // откладываем именно те значения, что драйвят пересчёт, а не сам инпут.
  const deferredQuantity = useDeferredValue(quantityRaw)
  const deferredDeadline = useDeferredValue(deadlineRaw)

  const product = products.find((p) => p.id === productId)
  const techMap = product?.techMap

  const deadlineDate = deferredDeadline ? new Date(`${deferredDeadline}T23:59:59`) : null
  const searchEndMs = Math.min(
    deadlineDate ? deadlineDate.getTime() + 2 * DAY_MS : now.getTime() + 30 * DAY_MS,
    now.getTime() + SEARCH_HORIZON_DAYS * DAY_MS,
  )

  const searchFromIso = now.toISOString()
  const searchToIso = new Date(searchEndMs).toISOString()
  const assignmentsQuery = useAssignmentsWindowQuery(searchFromIso, searchToIso)

  const occupancyIndex = useMemo(() => new OccupancyIndex(assignmentsQuery.data ?? []), [assignmentsQuery.data])

  const requiredHours = techMap && deferredQuantity > 0 ? Math.ceil(Number(deferredQuantity) / techMap.outputPerHour) : 0

  const groupMachines = useMemo(() => (techMap ? machines.filter((m) => m.groupId === techMap.machineGroupId) : []), [techMap, machines])

  const candidates = useMemo<Candidate[]>(() => {
    if (!techMap || requiredHours <= 0) return []
    const requiredMs = requiredHours * HOUR_MS
    const results: Candidate[] = []
    for (const machine of groupMachines) {
      const busy = occupancyIndex.findOverlapping(machine.id, now.getTime(), searchEndMs)
      const slot = findFirstAvailableSlot(busy, now.getTime(), searchEndMs, requiredMs)
      if (slot) {
        results.push({ machine, start: slot.start, end: slot.end, fitsDeadline: deadlineDate ? slot.end <= deadlineDate.getTime() : true })
      }
    }
    results.sort((a, b) => (a.fitsDeadline !== b.fitsDeadline ? (a.fitsDeadline ? -1 : 1) : a.start - b.start))
    return results.slice(0, 5)
    // deadlineDate меняется по ссылке каждый рендер — сравниваем по значению через getTime()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techMap, requiredHours, groupMachines, occupancyIndex, now, searchEndMs, deadlineDate?.getTime()])

  const [selectedIndex, setSelectedIndex] = useState(0)
  useEffect(() => setSelectedIndex(0), [productId])
  const clampedIndex = candidates.length > 0 ? Math.min(selectedIndex, candidates.length - 1) : 0
  const selectedCandidate = candidates[clampedIndex] ?? null

  // Синхронизируем превью в реальной матрице с выбранным (или наведённым) кандидатом
  useEffect(() => {
    if (!selectedCandidate || !product) {
      store.setPreviewGhost(null)
      return
    }
    store.setPreviewGhost({
      machineId: selectedCandidate.machine.id,
      hourStart: dateToHourIndex(store.epochMs, new Date(selectedCandidate.start)),
      durationHours: requiredHours,
      label: product.name,
    })
  }, [selectedCandidate, product, requiredHours, store])

  useEffect(() => () => store.setPreviewGhost(null), [store])

  const handleHoverCandidate = (candidate: Candidate) => {
    if (!product) return
    store.setPreviewGhost({
      machineId: candidate.machine.id,
      hourStart: dateToHourIndex(store.epochMs, new Date(candidate.start)),
      durationHours: requiredHours,
      label: product.name,
    })
  }

  const handleLeaveCandidate = () => {
    if (!selectedCandidate || !product) return
    store.setPreviewGhost({
      machineId: selectedCandidate.machine.id,
      hourStart: dateToHourIndex(store.epochMs, new Date(selectedCandidate.start)),
      durationHours: requiredHours,
      label: product.name,
    })
  }

  const createMutation = useCreateOrderMutation()

  const onSubmit = (values: OrderFormValues) => {
    if (!selectedCandidate) return
    createMutation.mutate(
      {
        productId: values.productId,
        quantity: values.quantity,
        deadline: new Date(`${values.deadline}T23:59:59`).toISOString(),
        priority: values.priority,
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

  const feasibility: { icon: typeof CheckCircle2; color: string; bg: string; text: string } | null = !techMap
    ? null
    : candidates.length === 0
      ? { icon: XCircle, color: 'var(--color-priority-critical)', bg: 'var(--color-priority-critical-bg)', text: `Не удаётся найти окно на ${SEARCH_HORIZON_DAYS} дней вперёд ни на одном станке группы «${techMap ? groupMachines[0]?.groupName ?? '' : ''}»` }
      : selectedCandidate?.fitsDeadline
        ? { icon: CheckCircle2, color: 'var(--color-priority-low)', bg: 'var(--color-priority-low-bg)', text: 'Укладывается в срок' }
        : {
            icon: AlertTriangle,
            color: 'var(--color-priority-high)',
            bg: 'var(--color-priority-high-bg)',
            text: `Не укладывается в дедлайн — ближайший реалистичный вариант: ${selectedCandidate ? format(new Date(selectedCandidate.end), 'd MMMM, HH:mm', { locale: ru }) : ''}`,
          }

  return (
    <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Новый заказ</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">Продукт</label>
            <select
              {...register('productId')}
              className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            >
              <option value="">Выберите продукт…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.productId && <p className="mt-1 text-xs text-red-600">{errors.productId.message}</p>}
          </div>

          {techMap && (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs">
              <div>
                <p className="text-[var(--color-ink-400)]">Группа станков</p>
                <p className="font-medium text-[var(--color-ink-900)]">{groupMachines[0]?.groupName ?? '—'}</p>
              </div>
              <div>
                <p className="text-[var(--color-ink-400)]">Темп</p>
                <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{techMap.outputPerHour} шт/ч</p>
              </div>
              <div>
                <p className="text-[var(--color-ink-400)]">Кратность упаковки</p>
                <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{techMap.packageMultiplicity} шт</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">Количество, шт.</label>
              <input
                type="number"
                {...register('quantity', { valueAsNumber: true })}
                className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
              />
              {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">Срок</label>
              <input
                type="date"
                {...register('deadline')}
                className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
              />
              {errors.deadline && <p className="mt-1 text-xs text-red-600">{errors.deadline.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">Приоритет</label>
            <select
              {...register('priority')}
              className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p)}
                </option>
              ))}
            </select>
          </div>

          {techMap && requiredHours > 0 && (
            <>
              <div className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-ink-600)]">
                Требуется машино-часов: <span className="font-semibold text-[var(--color-ink-900)]">{requiredHours} ч</span>
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
                        key={c.machine.id}
                        onClick={() => setSelectedIndex(i)}
                        onMouseEnter={() => handleHoverCandidate(c)}
                        onMouseLeave={handleLeaveCandidate}
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
            </>
          )}

          {createMutation.isError && <p className="text-xs font-medium text-red-600">Не удалось создать заказ — возможно, слот уже заняли. Попробуйте другой вариант.</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={createMutation.isPending}>
            Отмена
          </Button>
          <Button type="submit" variant="primary" disabled={!selectedCandidate || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Создать заказ
          </Button>
        </div>
      </form>
    </div>
  )
})
