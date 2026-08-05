import { describe, expect, it } from 'vitest'
import type { Order } from '@/entities/order'
import type { Machine } from '@/entities/machine'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import { answerQuery, type AssistantData } from './answer-query'

function makeOrder(id: string, code: string, status: Order['status']): Order {
  return { id, code, productId: 'p1', productName: 'Тестовый продукт', quantity: 10, deadline: new Date().toISOString(), priority: 'normal', status }
}

function makeMachine(id: string, name: string, status: Machine['status']): Machine {
  return { id, name, workshopId: 'w1', groupId: 'g1', groupName: 'Группа', status, capacityPerHour: 10, order: 0 }
}

const data: AssistantData = {
  orders: [makeOrder('o1', 'WO-2026-1001', 'at_risk'), makeOrder('o2', 'WO-2026-1002', 'needs_reassignment'), makeOrder('o3', 'WO-2026-1003', 'done')],
  machines: [makeMachine('m1', 'Токарный CTX-310', 'idle'), makeMachine('m2', 'Плазморез PC-503', 'running')],
  products: [],
  assignments: [{ id: 'a1', orderId: 'o3', machineId: 'm2', startAt: new Date().toISOString(), endAt: new Date().toISOString(), plannedQuantity: 10 }] as ScheduleAssignment[],
}

describe('answerQuery', () => {
  it('находит заказ по коду и указывает станок из назначения', () => {
    const answer = answerQuery('где заказ wo-2026-1003', data)
    expect(answer.text).toContain('WO-2026-1003')
    expect(answer.text).toContain('Плазморез PC-503')
    expect(answer.items).toHaveLength(1)
  })

  it('находит станок по названию', () => {
    const answer = answerQuery('что с токарный ctx-310', data)
    expect(answer.text).toContain('простаивает')
    expect(answer.items[0]?.label).toBe('Токарный CTX-310')
  })

  it('перечисляет заказы под риском', () => {
    const answer = answerQuery('какие заказы под риском срыва', data)
    expect(answer.text).toContain('1')
    expect(answer.items.map((i) => i.label)).toEqual(['WO-2026-1001'])
  })

  it('перечисляет заказы, нуждающиеся в переназначении', () => {
    const answer = answerQuery('что нуждается в переназначении', data)
    expect(answer.items.map((i) => i.label)).toEqual(['WO-2026-1002'])
  })

  it('перечисляет простаивающие станки', () => {
    const answer = answerQuery('какие станки простаивают', data)
    expect(answer.items.map((i) => i.label)).toEqual(['Токарный CTX-310'])
  })

  it('считает статистику по статусам', () => {
    const answer = answerQuery('сколько всего заказов', data)
    expect(answer.text).toContain('Всего заказов: 3')
  })

  it('возвращает подсказку на нераспознанный вопрос', () => {
    const answer = answerQuery('расскажи анекдот', data)
    expect(answer.text).toContain('Не нашёл ответа')
  })

  it('возвращает подсказку на пустой вопрос', () => {
    const answer = answerQuery('', data)
    expect(answer.items).toHaveLength(0)
    expect(answer.text.length).toBeGreaterThan(0)
  })
})
