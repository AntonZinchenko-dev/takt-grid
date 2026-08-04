import { X, Loader2, PlusCircle, ArrowRightLeft, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Order, OrderEvent, OrderEventType } from '@/entities/order'
import { priorityLabel, priorityColorVar, priorityBgVar, statusLabel, useOrderEventsQuery } from '@/entities/order'
import { Badge } from '@/shared/ui/Badge'

const STATUS_DOT: Record<Order['status'], string> = {
  planned: 'var(--color-priority-normal)',
  in_progress: 'var(--color-priority-low)',
  at_risk: 'var(--color-priority-high)',
  overdue: 'var(--color-priority-critical)',
  done: 'var(--color-priority-done)',
  needs_reassignment: 'var(--color-status-reassign)',
}

const EVENT_ICON: Record<OrderEventType, typeof PlusCircle> = {
  created: PlusCircle,
  reassigned: ArrowRightLeft,
  moved: ArrowRightLeft,
  unassigned: AlertTriangle,
  result: ClipboardCheck,
}

const EVENT_COLOR: Record<OrderEventType, string> = {
  created: 'var(--color-priority-low)',
  reassigned: 'var(--color-brand-600)',
  moved: 'var(--color-brand-600)',
  unassigned: 'var(--color-priority-critical)',
  result: 'var(--color-ink-600)',
}

const EVENT_TITLE: Record<OrderEventType, string> = {
  created: 'Заказ создан и назначен',
  reassigned: 'Переназначен',
  moved: 'Перенесён',
  unassigned: 'Снят с графика',
  result: 'Внесён результат',
}

interface OrderReportDrawerProps {
  order: Order
  onClose: () => void
}

function describeEvent(event: OrderEvent, delta: { fact: number; defect: number } | null): string {
  switch (event.type) {
    case 'created':
      return `Станок «${event.machineName ?? '—'}»`
    case 'reassigned':
      return `Новый станок «${event.machineName ?? '—'}»`
    case 'moved':
      return `«${event.fromMachineName ?? '—'}» → «${event.machineName ?? '—'}»`
    case 'unassigned':
      return `Станок «${event.machineName ?? '—'}» — ${event.reason ?? 'снято с графика'}`
    case 'result': {
      const deltaText = delta
        ? `факт ${delta.fact >= 0 ? '+' : ''}${delta.fact} шт, брак ${delta.defect >= 0 ? '+' : ''}${delta.defect} шт`
        : `факт ${event.actualQuantity ?? 0} шт, брак ${event.defectQuantity ?? 0} шт`
      return `Смена ${event.shiftNumber ?? '—'} · ${deltaText} · итого ${event.actualQuantity ?? 0}/${event.defectQuantity ?? 0} шт`
    }
    default:
      return ''
  }
}

/** Отчёт по заказу — сводка + полная история (кто/что/когда: назначения, переносы, снятия с графика, внесённые результаты по сменам). */
export function OrderReportDrawer({ order, onClose }: OrderReportDrawerProps) {
  const eventsQuery = useOrderEventsQuery(order.id)
  const events = eventsQuery.data ?? []
  // Список уже отсортирован сервером от новых к старым — для дельты берём следующую (более старую) запись result.
  const resultEvents = events.filter((e) => e.type === 'result')

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Отчёт: {order.code}</h2>
            <p className="text-xs text-[var(--color-ink-600)]">{order.productName}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
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
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">История</p>

            {eventsQuery.isLoading ? (
              <div className="flex items-center justify-center py-6 text-[var(--color-ink-400)]">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-xs text-[var(--color-ink-400)]">Событий пока нет</p>
            ) : (
              <ol className="space-y-1.5">
                {events.map((event) => {
                  const Icon = EVENT_ICON[event.type]
                  const color = EVENT_COLOR[event.type]
                  const delta =
                    event.type === 'result'
                      ? (() => {
                          const idx = resultEvents.findIndex((e) => e.id === event.id)
                          const prev = resultEvents[idx + 1]
                          return { fact: (event.actualQuantity ?? 0) - (prev?.actualQuantity ?? 0), defect: (event.defectQuantity ?? 0) - (prev?.defectQuantity ?? 0) }
                        })()
                      : null
                  return (
                    <li key={event.id} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium" style={{ color }}>
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          {EVENT_TITLE[event.type]}
                        </span>
                        <span className="shrink-0 text-[var(--color-ink-400)]">{format(new Date(event.at), 'd MMM, HH:mm', { locale: ru })}</span>
                      </div>
                      <p className="text-[var(--color-ink-600)]">{describeEvent(event, delta)}</p>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
