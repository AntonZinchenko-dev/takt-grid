import { describe, expect, it } from 'vitest'
import type { Order } from '@/entities/order'
import type { Machine } from '@/entities/machine'
import type { Product } from '@/entities/product'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import { rankOrders, planAutoSchedule } from './auto-schedule'

const h = (hour: number) => hour * 3_600_000

function makeMachine(id: string, groupId = 'g1'): Machine {
  return { id, name: `Станок ${id}`, workshopId: 'w1', groupId, groupName: 'Группа 1', status: 'running', capacityPerHour: 10, order: 0 }
}

function makeProduct(id: string, groupId = 'g1', outputPerHour = 10): Product {
  return { id, name: `Продукт ${id}`, techMap: { id: `tm-${id}`, productId: id, machineGroupId: groupId, outputPerHour, packageMultiplicity: 1 } }
}

function makeOrder(id: string, productId: string, quantity: number, deadlineMs: number, priority: Order['priority'] = 'normal'): Order {
  return { id, code: `WO-${id}`, productId, productName: '', quantity, deadline: new Date(deadlineMs).toISOString(), priority, status: 'needs_reassignment' }
}

describe('rankOrders', () => {
  const orders = [makeOrder('1', 'p1', 10, h(100), 'low'), makeOrder('2', 'p1', 10, h(50), 'critical'), makeOrder('3', 'p1', 10, h(10), 'normal')]

  it('fifo — не переупорядочивает', () => {
    expect(rankOrders(orders, 'fifo', { low: 1, normal: 2, high: 3, critical: 5 })).toEqual(orders)
  })

  it('deadline — по возрастанию дедлайна', () => {
    const ranked = rankOrders(orders, 'deadline', { low: 1, normal: 2, high: 3, critical: 5 })
    expect(ranked.map((o) => o.id)).toEqual(['3', '2', '1'])
  })

  it('priority — по весу приоритета, при равенстве по дедлайну', () => {
    const ranked = rankOrders(orders, 'priority', { low: 1, normal: 2, high: 3, critical: 5 })
    expect(ranked.map((o) => o.id)).toEqual(['2', '3', '1'])
  })
})

describe('planAutoSchedule', () => {
  it('назначает заказ на свободный станок группы и укладывает в дедлайн', () => {
    const machine = makeMachine('m1')
    const product = makeProduct('p1')
    const order = makeOrder('o1', 'p1', 40, h(10))

    const { proposals, rejections } = planAutoSchedule({
      orders: [order],
      products: [product],
      machines: [machine],
      occupancyIndex: new OccupancyIndex(),
      downtimeByMachine: new Map(),
      now: h(0),
      horizonMs: h(48),
    })

    expect(rejections).toHaveLength(0)
    expect(proposals[0]).toMatchObject({ orderId: 'o1', fitsDeadline: true, start: h(0), end: h(4) })
  })

  it('не задваивает бронирование — второй заказ в очереди получает следующий свободный слот', () => {
    const machine = makeMachine('m1')
    const product = makeProduct('p1')
    const orders = [makeOrder('o1', 'p1', 40, h(48)), makeOrder('o2', 'p1', 40, h(48))]

    const { proposals } = planAutoSchedule({
      orders,
      products: [product],
      machines: [machine],
      occupancyIndex: new OccupancyIndex(),
      downtimeByMachine: new Map(),
      now: h(0),
      horizonMs: h(48),
    })

    expect(proposals[0]).toMatchObject({ start: h(0), end: h(4) })
    expect(proposals[1]).toMatchObject({ start: h(4), end: h(8) })
  })

  it('отклоняет заказ, если нет станков нужной группы', () => {
    const product = makeProduct('p1', 'missing-group')
    const order = makeOrder('o1', 'p1', 10, h(48))

    const { proposals, rejections } = planAutoSchedule({
      orders: [order],
      products: [product],
      machines: [makeMachine('m1', 'g1')],
      occupancyIndex: new OccupancyIndex(),
      downtimeByMachine: new Map(),
      now: h(0),
      horizonMs: h(48),
    })

    expect(proposals).toHaveLength(0)
    expect(rejections[0]?.reason).toContain('Нет станков группы')
  })

  it('отклоняет заказ, если в горизонте планирования нет свободного окна', () => {
    const machine = makeMachine('m1')
    const product = makeProduct('p1')
    const order = makeOrder('o1', 'p1', 1000, h(48))
    const occupancyIndex = new OccupancyIndex([{ id: 'busy', machineId: 'm1', startAt: new Date(h(0)), endAt: new Date(h(47)) }])

    const { proposals, rejections } = planAutoSchedule({
      orders: [order],
      products: [product],
      machines: [machine],
      occupancyIndex,
      downtimeByMachine: new Map(),
      now: h(0),
      horizonMs: h(48),
    })

    expect(proposals).toHaveLength(0)
    expect(rejections[0]?.reason).toContain('Нет свободного окна')
  })
})
