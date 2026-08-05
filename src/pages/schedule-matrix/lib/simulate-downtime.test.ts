import { describe, expect, it } from 'vitest'
import type { Order } from '@/entities/order'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import { simulateMachineDowntime } from './simulate-downtime'

const h = (hour: number) => hour * 3_600_000

function makeAssignment(id: string, machineId: string, orderId: string, startHour: number, endHour: number): ScheduleAssignment {
  return { id, orderId, machineId, startAt: new Date(h(startHour)).toISOString(), endAt: new Date(h(endHour)).toISOString(), plannedQuantity: 10 }
}

function makeOrder(id: string, code: string, status: Order['status'] = 'planned'): Order {
  return { id, code, productId: 'p1', productName: '', quantity: 10, deadline: new Date(h(100)).toISOString(), priority: 'normal', status }
}

describe('simulateMachineDowntime', () => {
  it('находит назначения, пересекающие окно простоя на этом станке', () => {
    const assignments = [makeAssignment('a1', 'm1', 'o1', 2, 6), makeAssignment('a2', 'm1', 'o2', 10, 14)]
    const orders = [makeOrder('o1', 'WO-1'), makeOrder('o2', 'WO-2')]

    const result = simulateMachineDowntime(assignments, orders, 'm1', h(0), h(8))

    expect(result.affected).toHaveLength(1)
    expect(result.affected[0]).toMatchObject({ orderId: 'o1', orderCode: 'WO-1' })
  })

  it('игнорирует назначения на других станках', () => {
    const assignments = [makeAssignment('a1', 'm2', 'o1', 2, 6)]
    const orders = [makeOrder('o1', 'WO-1')]

    const result = simulateMachineDowntime(assignments, orders, 'm1', h(0), h(8))

    expect(result.affected).toHaveLength(0)
  })

  it('не трогает уже выполненные заказы', () => {
    const assignments = [makeAssignment('a1', 'm1', 'o1', 2, 6)]
    const orders = [makeOrder('o1', 'WO-1', 'done')]

    const result = simulateMachineDowntime(assignments, orders, 'm1', h(0), h(8))

    expect(result.affected).toHaveLength(0)
  })

  it('не пересекающиеся по времени назначения не считаются затронутыми', () => {
    const assignments = [makeAssignment('a1', 'm1', 'o1', 20, 24)]
    const orders = [makeOrder('o1', 'WO-1')]

    const result = simulateMachineDowntime(assignments, orders, 'm1', h(0), h(8))

    expect(result.affected).toHaveLength(0)
  })
})
