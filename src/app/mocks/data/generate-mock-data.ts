import { faker } from '@faker-js/faker'
import type { Workshop } from '@/entities/workshop'
import type { Machine, MachineStatus, DowntimeRule } from '@/entities/machine'
import type { Product } from '@/entities/product'
import type { Order, OrderPriority, OrderStatus } from '@/entities/order'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import { RANGE_START_DAYS, RANGE_END_DAYS } from '@/pages/schedule-matrix'

/**
 * Синтетический датасет для MSW.
 *
 * Принципиально НЕ используем faker для доменных существительных (названия
 * станков/продуктов) — генератор случайных слов на ru-локали faker даёт
 * нечитаемый шум. Домен — из курируемых списков ниже, faker — только для
 * чисел, дат, id и взвешенного случайного выбора. Seed фиксирован, чтобы
 * датасет был воспроизводим между перезапусками (важно для скриншотов
 * в портфолио и для дебага конкретной ячейки).
 */

const HOUR = 3_600_000
const DAY = 24 * HOUR

export interface MockDataset {
  workshops: Workshop[]
  machines: Machine[]
  products: Product[]
  orders: Order[]
  assignments: ScheduleAssignment[]
  downtimeRules: DowntimeRule[]
  generatedAt: string
}

const WORKSHOP_DEFS = [
  { name: 'Цех №1 — Металлообработка' },
  { name: 'Цех №2 — Покраска' },
  { name: 'Цех №3 — Сборка' },
  { name: 'Цех №4 — Упаковка' },
]

interface GroupDef {
  id: string
  name: string
  workshopIndex: number
  namePrefixes: string[]
  capacityRange: [number, number]
}

const GROUPS: GroupDef[] = [
  { id: 'cutting', name: 'Резка', workshopIndex: 0, namePrefixes: ['Лазерный станок LF', 'Плазморез PC'], capacityRange: [40, 90] },
  { id: 'turning', name: 'Токарная обработка', workshopIndex: 0, namePrefixes: ['Токарный станок CTX', 'Токарный автомат TA'], capacityRange: [30, 70] },
  { id: 'milling', name: 'Фрезерная обработка', workshopIndex: 0, namePrefixes: ['Фрезерный центр VF', 'Обрабатывающий центр MC'], capacityRange: [25, 60] },
  { id: 'welding', name: 'Сварка', workshopIndex: 0, namePrefixes: ['Сварочная линия WL', 'Сварочный робот SR'], capacityRange: [35, 80] },
  { id: 'painting', name: 'Покраска', workshopIndex: 1, namePrefixes: ['Покрасочная камера PK', 'Порошковая линия PL'], capacityRange: [20, 50] },
  { id: 'assembly', name: 'Сборка', workshopIndex: 2, namePrefixes: ['Сборочная линия AL', 'Сборочный робот SR', 'Конвейерная линия CL'], capacityRange: [50, 120] },
  { id: 'packaging', name: 'Упаковка', workshopIndex: 3, namePrefixes: ['Упаковочная линия UP', 'Фасовочный автомат FA'], capacityRange: [60, 150] },
]

const MACHINES_PER_GROUP = 9

const PRODUCT_DEFS: Array<{ name: string; groupId: string; outputPerHour: number; packageMultiplicity: number }> = [
  { name: 'Корпус насоса', groupId: 'milling', outputPerHour: 12, packageMultiplicity: 6 },
  { name: 'Кронштейн крепёжный', groupId: 'cutting', outputPerHour: 40, packageMultiplicity: 50 },
  { name: 'Панель управления', groupId: 'assembly', outputPerHour: 18, packageMultiplicity: 12 },
  { name: 'Кожух вентилятора', groupId: 'painting', outputPerHour: 25, packageMultiplicity: 24 },
  { name: 'Вал приводной', groupId: 'turning', outputPerHour: 15, packageMultiplicity: 10 },
  { name: 'Фланец соединительный', groupId: 'turning', outputPerHour: 22, packageMultiplicity: 20 },
  { name: 'Рама сварная', groupId: 'welding', outputPerHour: 8, packageMultiplicity: 4 },
  { name: 'Крышка редуктора', groupId: 'milling', outputPerHour: 14, packageMultiplicity: 12 },
  { name: 'Кронштейн опорный', groupId: 'cutting', outputPerHour: 35, packageMultiplicity: 50 },
  { name: 'Патрубок вытяжной', groupId: 'welding', outputPerHour: 10, packageMultiplicity: 6 },
  { name: 'Стойка стеллажная', groupId: 'welding', outputPerHour: 9, packageMultiplicity: 4 },
  { name: 'Короб распределительный', groupId: 'assembly', outputPerHour: 20, packageMultiplicity: 12 },
  { name: 'Заслонка регулирующая', groupId: 'cutting', outputPerHour: 45, packageMultiplicity: 50 },
  { name: 'Модуль охлаждения', groupId: 'assembly', outputPerHour: 16, packageMultiplicity: 8 },
  { name: 'Плата монтажная', groupId: 'painting', outputPerHour: 30, packageMultiplicity: 24 },
  { name: 'Кассета упаковочная', groupId: 'packaging', outputPerHour: 80, packageMultiplicity: 100 },
  { name: 'Ящик транспортировочный', groupId: 'packaging', outputPerHour: 60, packageMultiplicity: 50 },
  { name: 'Втулка направляющая', groupId: 'turning', outputPerHour: 28, packageMultiplicity: 20 },
]

const DOWNTIME_REASONS = ['Поломка', 'Техобслуживание', 'Переналадка', 'Простой']

function buildWorkshops(): Workshop[] {
  return WORKSHOP_DEFS.map((w, i) => ({ id: `ws-${i + 1}`, order: i + 1, ...w }))
}

function buildMachines(workshops: Workshop[]): Machine[] {
  const machines: Machine[] = []
  let orderCounter = 0
  for (const group of GROUPS) {
    const workshop = workshops[group.workshopIndex]
    if (!workshop) continue
    for (let i = 0; i < MACHINES_PER_GROUP; i++) {
      const prefix = faker.helpers.arrayElement(group.namePrefixes)
      const code = faker.number.int({ min: 100, max: 999 })
      const status = faker.helpers.weightedArrayElement<MachineStatus>([
        { value: 'running', weight: 8 },
        { value: 'idle', weight: 1.5 },
        { value: 'down', weight: 0.5 },
      ])
      machines.push({
        id: `m-${group.id}-${i + 1}`,
        name: `${prefix}-${code}`,
        workshopId: workshop.id,
        groupId: group.id,
        groupName: group.name,
        status,
        capacityPerHour: faker.number.int({ min: group.capacityRange[0], max: group.capacityRange[1] }),
        order: orderCounter++,
      })
    }
  }
  return machines
}

function buildProducts(): Product[] {
  return PRODUCT_DEFS.map((def, i) => {
    const productId = `p-${i + 1}`
    return {
      id: productId,
      name: def.name,
      techMap: {
        id: `tm-${i + 1}`,
        productId,
        machineGroupId: def.groupId,
        outputPerHour: def.outputPerHour,
        packageMultiplicity: def.packageMultiplicity,
      },
    }
  })
}

function pickPriority(): OrderPriority {
  return faker.helpers.weightedArrayElement<OrderPriority>([
    { value: 'low', weight: 3 },
    { value: 'normal', weight: 5 },
    { value: 'high', weight: 2.5 },
    { value: 'critical', weight: 1 },
  ])
}

function pickBaseStatus(isPast: boolean): OrderStatus {
  if (isPast) {
    return faker.helpers.weightedArrayElement<OrderStatus>([
      { value: 'done', weight: 9 },
      { value: 'overdue', weight: 1 },
    ])
  }
  return faker.helpers.weightedArrayElement<OrderStatus>([
    { value: 'planned', weight: 6 },
    { value: 'in_progress', weight: 3 },
  ])
}

/** Идём по таймлайну каждого станка вперёд, чередуя назначения и простои. */
function buildScheduleAndOrders(
  machines: Machine[],
  products: Product[],
  now: Date,
): { orders: Order[]; assignments: ScheduleAssignment[] } {
  const rangeStart = now.getTime() + RANGE_START_DAYS * DAY
  // TODO(temp/manual-testing): пусто с 6 числа текущего месяца — чтобы вручную
  // потыкать создание/перенос заказов на чистом холсте. Убрать перед демо/коммитом.
  const manualTestCutoff = new Date(now.getFullYear(), now.getMonth(), 6, 0, 0, 0, 0)
  if (manualTestCutoff.getTime() <= now.getTime()) manualTestCutoff.setMonth(manualTestCutoff.getMonth() + 1)
  const rangeEnd = Math.min(now.getTime() + RANGE_END_DAYS * DAY, manualTestCutoff.getTime())

  const orders: Order[] = []
  const assignments: ScheduleAssignment[] = []
  let orderSeq = 1000
  // Safety net only — the real stop condition is cursor >= rangeEnd. Min step per
  // iteration is a 2h assignment with no gap, so rangeEnd is always reached well
  // before this many iterations; without it a bug in the advance logic could hang.
  const maxAssignmentsPerMachine = 5000

  for (const machine of machines) {
    const productsForGroup = products.filter((p) => p.techMap.machineGroupId === machine.groupId)
    if (productsForGroup.length === 0) continue

    let cursor = rangeStart + faker.number.int({ min: 0, max: 6 }) * HOUR

    for (let i = 0; i < maxAssignmentsPerMachine && cursor < rangeEnd; i++) {
      const gapHours = faker.helpers.weightedArrayElement([
        { value: 0, weight: 6 },
        { value: faker.number.int({ min: 1, max: 3 }), weight: 2 },
        { value: faker.number.int({ min: 4, max: 10 }), weight: 1 },
      ])
      cursor += gapHours * HOUR
      if (cursor >= rangeEnd) break

      const durationHours = faker.number.int({ min: 2, max: 10 })
      const startAt = new Date(cursor)
      const endAt = new Date(cursor + durationHours * HOUR)
      cursor = endAt.getTime()

      const product = faker.helpers.arrayElement(productsForGroup)
      const quantity = Math.round(durationHours * product.techMap.outputPerHour)
      const isPast = endAt.getTime() < now.getTime()

      orderSeq += 1
      const orderId = `o-${orderSeq}`
      const code = `WO-${startAt.getFullYear()}-${orderSeq}`

      const deadlineSlackHours = faker.helpers.weightedArrayElement([
        { value: faker.number.int({ min: 12, max: 72 }), weight: 6 },
        { value: faker.number.int({ min: -12, max: 4 }), weight: 1 },
      ])
      const deadline = new Date(endAt.getTime() + deadlineSlackHours * HOUR)

      let status = pickBaseStatus(isPast)
      const priority = pickPriority()

      if (!isPast && status !== 'done') {
        if (deadline.getTime() < now.getTime()) status = 'overdue'
        else if (deadline.getTime() - endAt.getTime() < 6 * HOUR) status = 'at_risk'
      }

      orders.push({
        id: orderId,
        code,
        productId: product.id,
        productName: product.name,
        quantity,
        deadline: deadline.toISOString(),
        priority,
        status,
      })

      assignments.push({
        id: `a-${orderSeq}`,
        orderId,
        machineId: machine.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        plannedQuantity: quantity,
      })
    }
  }

  return { orders, assignments }
}

function buildDowntimeRules(machines: Machine[], now: Date): DowntimeRule[] {
  const rules: DowntimeRule[] = []
  let seq = 1
  for (const machine of machines) {
    const count = machine.status === 'down' ? 2 : faker.number.int({ min: 0, max: 1 })
    for (let i = 0; i < count; i++) {
      const dayOffset = faker.number.int({ min: -5, max: 30 })
      const startHour = faker.number.int({ min: 0, max: 20 })
      const start = new Date(now)
      start.setDate(start.getDate() + dayOffset)
      start.setHours(startHour, 0, 0, 0)
      const durationHours = faker.number.int({ min: 2, max: 6 })
      const end = new Date(start.getTime() + durationHours * HOUR)
      rules.push({
        id: `dt-${seq++}`,
        machineId: machine.id,
        recurrence: 'once',
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        reason: faker.helpers.arrayElement(DOWNTIME_REASONS),
      })
    }
  }
  return rules
}

let cached: MockDataset | null = null

export function getMockDataset(): MockDataset {
  if (cached) return cached

  faker.seed(42)
  const now = new Date()
  const workshops = buildWorkshops()
  const machines = buildMachines(workshops)
  const products = buildProducts()
  const { orders, assignments } = buildScheduleAndOrders(machines, products, now)
  const downtimeRules = buildDowntimeRules(machines, now)

  cached = {
    workshops,
    machines,
    products,
    orders,
    assignments,
    downtimeRules,
    generatedAt: now.toISOString(),
  }
  return cached
}
