import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X, Loader2, CheckCircle2, AlertTriangle, XCircle, Eye, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import type { GridStore } from '../model/grid-store'
import type { UndoStore } from '../model/undo-store'
import { rankOrders, planAutoSchedule, type ScheduleProposal, type ScheduleRejection } from '../lib/auto-schedule'
import { dateToHourIndex, DAY_MS } from '../lib/timeline'
import { useOrdersQuery, priorityLabel, priorityColorVar, priorityBgVar, type Order } from '@/entities/order'
import { useProductsQuery } from '@/entities/product'
import type { Machine, DowntimeRule } from '@/entities/machine'
import { useAssignmentsWindowQuery, useCreateAssignmentMutation } from '@/entities/schedule-assignment'
import { useDeleteAssignmentMutation } from '@/entities/schedule-assignment'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import { usePlanningSettingsStore } from '@/entities/setting'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { useToastStore } from '@/shared/lib/toast-store'
import { broadcastMatrixEvent } from '../model/use-presence-channel'

const ALGORITHM_LABEL: Record<string, string> = { fifo: 'FIFO', priority: 'по приоритету', deadline: 'по дедлайну' }

interface AutoScheduleDrawerProps {
  store: GridStore
  undoStore: UndoStore
  machines: Machine[]
  downtimeByMachine: Map<string, DowntimeRule[]>
  onClose: () => void
}

interface AssignmentTracker {
  orderId: string
  orderCode: string
  machineId: string
  startAt: string
  endAt: string
  plannedQuantity: number
  currentId: string | null
}

export function AutoScheduleDrawer({ store, undoStore, machines, downtimeByMachine, onClose }: AutoScheduleDrawerProps) {
  const planningSettings = usePlanningSettingsStore()
  const now = useMemo(() => new Date(), [])
  const horizonMs = planningSettings.orderHorizonDays * DAY_MS

  const ordersQuery = useOrdersQuery({ status: 'needs_reassignment' })
  const productsQuery = useProductsQuery()
  const assignmentsQuery = useAssignmentsWindowQuery(now.toISOString(), new Date(now.getTime() + horizonMs).toISOString())
  const createMutation = useCreateAssignmentMutation()
  const deleteMutation = useDeleteAssignmentMutation()
  const pushToast = useToastStore((s) => s.push)

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const ordersById = useMemo(() => new Map((ordersQuery.data ?? []).map((o) => [o.id, o])), [ordersQuery.data])

  const rankedOrders = useMemo(
    () => rankOrders(ordersQuery.data ?? [], planningSettings.schedulingAlgorithm, planningSettings.priorityWeights),
    [ordersQuery.data, planningSettings.schedulingAlgorithm, planningSettings.priorityWeights],
  )

  const plan = useMemo(() => {
    if (!productsQuery.data) return null
    const occupancyIndex = new OccupancyIndex(assignmentsQuery.data ?? [])
    return planAutoSchedule({ orders: rankedOrders, products: productsQuery.data, machines, occupancyIndex, downtimeByMachine, now: now.getTime(), horizonMs })
    // downtimeByMachine — новая ссылка на карту почти каждый рендер родителя, сравниваем по данным заказов/продуктов/окна
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedOrders, productsQuery.data, assignmentsQuery.data, machines, now, horizonMs])

  const proposalByOrderId = useMemo(() => new Map((plan?.proposals ?? []).map((p) => [p.orderId, p])), [plan])
  const rejectionByOrderId = useMemo(() => new Map((plan?.rejections ?? []).map((r) => [r.orderId, r])), [plan])

  useEffect(() => () => store.setPreviewGhost(null), [store])

  const previewSlot = (machineId: string, start: number, end: number, label: string) => {
    store.setPreviewGhost({ machineId, hourStart: dateToHourIndex(store.epochMs, new Date(start)), durationHours: Math.round((end - start) / 3_600_000), label })
  }

  const handleApply = async () => {
    const proposals = plan?.proposals ?? []
    if (proposals.length === 0) return
    setApplying(true)
    const trackers: AssignmentTracker[] = []
    for (const proposal of proposals) {
      const order = ordersById.get(proposal.orderId)
      if (!order) continue
      try {
        const created = await createMutation.mutateAsync({
          orderId: proposal.orderId,
          machineId: proposal.machine.id,
          startAt: new Date(proposal.start).toISOString(),
          endAt: new Date(proposal.end).toISOString(),
          plannedQuantity: order.quantity,
        })
        trackers.push({
          orderId: proposal.orderId,
          orderCode: order.code,
          machineId: proposal.machine.id,
          startAt: created.startAt,
          endAt: created.endAt,
          plannedQuantity: order.quantity,
          currentId: created.id,
        })
        broadcastMatrixEvent({ type: 'assignment-created', orderCode: order.code, machineName: proposal.machine.name })
      } catch {
        // одна неудача (например, гонка с другой мутацией) не должна прерывать применение остального плана
      }
    }
    setApplying(false)

    if (trackers.length > 0) {
      undoStore.push({
        label: `авто-расстановка (${trackers.length})`,
        undo: async () => {
          await Promise.all(
            trackers.map(async (t) => {
              if (!t.currentId) return
              await deleteMutation.mutateAsync(t.currentId)
              t.currentId = null
            }),
          )
        },
        redo: async () => {
          await Promise.all(
            trackers.map(async (t) => {
              if (t.currentId) return
              const created = await createMutation.mutateAsync({ orderId: t.orderId, machineId: t.machineId, startAt: t.startAt, endAt: t.endAt, plannedQuantity: t.plannedQuantity })
              t.currentId = created.id
            }),
          )
        },
      })
    }
    pushToast(`Назначено ${trackers.length} из ${proposals.length} заказов`, trackers.length === proposals.length ? 'success' : 'info')
    onClose()
  }

  const renderRow = (order: Order, proposal: ScheduleProposal | undefined, rejection: ScheduleRejection | undefined) => {
    const isExpanded = expandedOrderId === order.id
    return (
      <div key={order.id} className="rounded-lg border border-[var(--color-border)]">
        <div className="flex items-start gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-[var(--color-ink-900)]">{order.code}</span>
              <Badge color={priorityColorVar(order.priority)} bg={priorityBgVar(order.priority)}>
                {priorityLabel(order.priority)}
              </Badge>
            </div>
            <p className="text-xs text-[var(--color-ink-600)]">{order.productName}</p>
            {proposal && (
              <button
                onClick={() => previewSlot(proposal.machine.id, proposal.start, proposal.end, order.code)}
                className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-ink-600)] hover:text-[var(--color-brand-600)]"
              >
                <Eye className="h-3 w-3 shrink-0" />
                {proposal.machine.name} · {format(new Date(proposal.start), 'd MMM, HH:mm', { locale: ru })} – {format(new Date(proposal.end), 'HH:mm', { locale: ru })}
              </button>
            )}
            {rejection && <p className="mt-1 text-xs text-[var(--color-priority-critical)]">{rejection.reason}</p>}
          </div>
          <div className="shrink-0 text-right">
            {proposal ? (
              proposal.fitsDeadline ? (
                <Badge color="var(--color-priority-low)" bg="var(--color-priority-low-bg)">
                  <CheckCircle2 className="h-3 w-3" /> В срок
                </Badge>
              ) : (
                <Badge color="var(--color-priority-high)" bg="var(--color-priority-high-bg)">
                  <AlertTriangle className="h-3 w-3" /> Позже срока
                </Badge>
              )
            ) : (
              <Badge color="var(--color-priority-critical)" bg="var(--color-priority-critical-bg)">
                <XCircle className="h-3 w-3" /> Отклонён
              </Badge>
            )}
          </div>
        </div>
        {proposal && proposal.alternatives.length > 0 && (
          <div className="border-t border-[var(--color-border)]">
            <button
              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-[11px] text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Рассмотрено ещё {proposal.alternatives.length} {proposal.alternatives.length === 1 ? 'вариант' : 'варианта'} — почему не выбраны
            </button>
            {isExpanded && (
              <div className="space-y-1 px-3 pb-2">
                {proposal.alternatives.map((alt) => (
                  <button
                    key={`${alt.machine.id}-${alt.start}`}
                    onClick={() => previewSlot(alt.machine.id, alt.start, alt.end, order.code)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]"
                  >
                    <Eye className="h-3 w-3 shrink-0 text-[var(--color-ink-400)]" />
                    {alt.machine.name} · {format(new Date(alt.start), 'd MMM, HH:mm', { locale: ru })}
                    {!alt.fitsDeadline && <span className="text-[var(--color-priority-high)]">— не в срок</span>}
                    {alt.start > proposal.start && <span className="text-[var(--color-ink-400)]">— освобождается позже выбранного</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const isLoading = ordersQuery.isLoading || productsQuery.isLoading || assignmentsQuery.isLoading

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-[var(--color-ink-900)]">
              <Sparkles className="h-4 w-4 text-[var(--color-brand-600)]" />
              Авто-расстановка
            </h2>
            <p className="text-xs text-[var(--color-ink-600)]">
              Приоритизация {ALGORITHM_LABEL[planningSettings.schedulingAlgorithm]}, горизонт {planningSettings.orderHorizonDays} дн. — см. Настройки → Планирование
            </p>
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rankedOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-ink-400)]">Нет заказов, нуждающихся в переназначении</p>
          ) : (
            rankedOrders.map((order) => renderRow(order, proposalByOrderId.get(order.id), rejectionByOrderId.get(order.id)))
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={applying}>
            Закрыть
          </Button>
          <Button variant="primary" onClick={handleApply} disabled={applying || (plan?.proposals.length ?? 0) === 0}>
            {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Применить к {plan?.proposals.length ?? 0} {plan?.proposals.length === 1 ? 'заказу' : 'заказам'}
          </Button>
        </div>
      </div>
    </div>
  )
}
