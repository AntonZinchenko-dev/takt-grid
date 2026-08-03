import { X } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Order } from '@/entities/order'
import { priorityLabel, priorityColorVar, priorityBgVar, statusLabel } from '@/entities/order'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import type { Machine } from '@/entities/machine'
import { Badge } from '@/shared/ui/Badge'

const STATUS_DOT: Record<Order['status'], string> = {
  planned: 'var(--color-priority-normal)',
  in_progress: 'var(--color-priority-low)',
  at_risk: 'var(--color-priority-high)',
  overdue: 'var(--color-priority-critical)',
  done: 'var(--color-priority-done)',
}

interface OrderDetailDrawerProps {
  order: Order
  assignment: ScheduleAssignment
  machine: Machine
  workshopName: string
  onClose: () => void
}

export function OrderDetailDrawer({ order, assignment, machine, workshopName, onClose }: OrderDetailDrawerProps) {
  const durationHours = Math.round((new Date(assignment.endAt).getTime() - new Date(assignment.startAt).getTime()) / 3_600_000)

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
        </div>
      </div>
    </div>
  )
}
