import type { Order } from '@/entities/order'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'

export interface AffectedAssignment {
  assignmentId: string
  orderId: string
  orderCode: string
  startAt: string
  endAt: string
}

export interface DowntimeSimulationResult {
  affected: AffectedAssignment[]
}

/**
 * Зеркалит проверку пересечения из cascadeUnassign (src/app/mocks/data/generate-mock-data.ts)
 * намеренно отдельной копией, а не импортом оттуда — тот модуль часть инфраструктуры MSW,
 * а не то, что должен знать pages-слой. Ничего не мутирует (в отличие от оригинала) — только
 * сообщает, какие назначения попали бы под снятие с графика, если бы простой был реальным.
 */
export function simulateMachineDowntime(assignments: ScheduleAssignment[], orders: Order[], machineId: string, windowStart: number, windowEnd: number): DowntimeSimulationResult {
  const ordersById = new Map(orders.map((o) => [o.id, o]))
  const affected: AffectedAssignment[] = []

  for (const a of assignments) {
    if (a.machineId !== machineId) continue
    const aStart = new Date(a.startAt).getTime()
    const aEnd = new Date(a.endAt).getTime()
    if (!(aStart < windowEnd && aEnd > windowStart)) continue

    const order = ordersById.get(a.orderId)
    if (order?.status === 'done') continue

    affected.push({ assignmentId: a.id, orderId: a.orderId, orderCode: order?.code ?? a.orderId, startAt: a.startAt, endAt: a.endAt })
  }

  return { affected }
}
