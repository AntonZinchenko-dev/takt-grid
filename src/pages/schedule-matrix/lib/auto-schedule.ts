import type { Order } from '@/entities/order'
import type { Machine, DowntimeRule } from '@/entities/machine'
import type { Product } from '@/entities/product'
import type { OccupancyIndex } from '@/shared/lib/occupancy-index'
import type { SchedulingAlgorithm, PriorityWeights } from '@/entities/setting'
import { findSlotCandidates, type SlotCandidate } from './slot-candidates'
import { HOUR_MS, DAY_MS } from './timeline'

/**
 * Сортировка очереди заказов перед авто-расстановкой — использует тот же
 * `usePlanningSettingsStore` (алгоритм + веса приоритета), что отображается на
 * вкладке "Настройки → Планирование", чтобы это была реальная связь, а не витрина.
 * 'fifo' — порядок как пришёл (в моках это порядок создания), без пересортировки.
 */
export function rankOrders(orders: Order[], algorithm: SchedulingAlgorithm, priorityWeights: PriorityWeights): Order[] {
  if (algorithm === 'fifo') return orders

  const sorted = [...orders]
  if (algorithm === 'deadline') {
    sorted.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    return sorted
  }

  sorted.sort((a, b) => {
    const weightDiff = priorityWeights[b.priority] - priorityWeights[a.priority]
    if (weightDiff !== 0) return weightDiff
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })
  return sorted
}

export interface ScheduleProposal {
  orderId: string
  machine: Machine
  start: number
  end: number
  fitsDeadline: boolean
  /** Остальные рассмотренные, но не выбранные кандидаты — материал для "почему не сюда". */
  alternatives: SlotCandidate[]
}

export interface ScheduleRejection {
  orderId: string
  reason: string
}

export interface PlanAutoScheduleParams {
  /** Уже отсортированная (rankOrders) очередь заказов needs_reassignment. */
  orders: Order[]
  products: Product[]
  machines: Machine[]
  /**
   * Индекс занятости, который планировщик мутирует (insert) по мере принятия
   * предложений, чтобы следующий заказ в очереди не претендовал на то же окно.
   * Вызывающий код должен передать одноразовый scratch-инстанс, а не общий рабочий.
   */
  occupancyIndex: OccupancyIndex
  downtimeByMachine: Map<string, DowntimeRule[]>
  now: number
  horizonMs: number
}

export function planAutoSchedule({ orders, products, machines, occupancyIndex, downtimeByMachine, now, horizonMs }: PlanAutoScheduleParams): {
  proposals: ScheduleProposal[]
  rejections: ScheduleRejection[]
} {
  const proposals: ScheduleProposal[] = []
  const rejections: ScheduleRejection[] = []
  const productById = new Map(products.map((p) => [p.id, p]))
  const searchEnd = now + horizonMs
  const horizonDays = Math.round(horizonMs / DAY_MS)

  for (const order of orders) {
    const product = productById.get(order.productId)
    if (!product) {
      rejections.push({ orderId: order.id, reason: 'Продукт заказа не найден в каталоге' })
      continue
    }

    const groupMachines = machines.filter((m) => m.groupId === product.techMap.machineGroupId)
    if (groupMachines.length === 0) {
      rejections.push({ orderId: order.id, reason: `Нет станков группы «${product.techMap.machineGroupId}»` })
      continue
    }

    const requiredMs = Math.ceil(order.quantity / product.techMap.outputPerHour) * HOUR_MS
    const deadlineMs = new Date(order.deadline).getTime()
    const candidates = findSlotCandidates({ groupMachines, occupancyIndex, downtimeByMachine, searchStart: now, searchEnd, requiredMs, deadlineMs, limit: 5 })

    if (candidates.length === 0) {
      rejections.push({ orderId: order.id, reason: `Нет свободного окна в горизонте планирования (${horizonDays} дн.) ни на одном станке группы` })
      continue
    }

    const [chosen, ...alternatives] = candidates as [SlotCandidate, ...SlotCandidate[]]
    proposals.push({ orderId: order.id, machine: chosen.machine, start: chosen.start, end: chosen.end, fitsDeadline: chosen.fitsDeadline, alternatives })
    occupancyIndex.insert({ id: `auto-pending-${order.id}`, machineId: chosen.machine.id, start: chosen.start, end: chosen.end })
  }

  return { proposals, rejections }
}
