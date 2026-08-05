import type { Workshop } from '@/entities/workshop'
import type { Machine, MachineStatus, DowntimeRule } from '@/entities/machine'
import type { Product } from '@/entities/product'
import type { Order, OrderPriority, OrderStatus, OrderEvent } from '@/entities/order'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import type { Shift, WorkCalendarSettings } from '@/entities/shift'
import type { Role, Group, TeamMember } from '@/entities/user'
import { PERMISSIONS } from '@/entities/user'
import type { NotificationChannel, NotificationRule, NotificationTemplate } from '@/entities/notification-setting'
import type { ApiKey, Webhook, ExternalIntegration } from '@/entities/integration'
import { RANGE_START_DAYS, RANGE_END_DAYS } from '@/shared/lib/schedule-window'

/**
 * Синтетический датасет для MSW.
 *
 * Принципиально НЕ используем faker для доменных существительных (названия
 * станков/продуктов) — генератор случайных слов на ru-локали faker даёт
 * нечитаемый шум. Домен — из курируемых списков ниже, а для чисел и
 * взвешенного случайного выбора — собственный сидированный PRNG (mulberry32)
 * вместо faker: та же воспроизводимость датасета между перезапусками (важно
 * для скриншотов в портфолио и для дебага конкретной ячейки), но без ~800 КБ
 * библиотеки faker в бандле ради трёх примитивов.
 */

function createRng(seed: number) {
  let state = seed
  return function random(): number {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = createRng(42)

function randomInt({ min, max }: { min: number; max: number }): number {
  return Math.floor(random() * (max - min + 1)) + min
}

function arrayElement<T>(items: readonly T[]): T {
  const item = items[randomInt({ min: 0, max: items.length - 1 })]
  if (item === undefined) throw new Error('arrayElement: empty array')
  return item
}

function weightedArrayElement<T>(options: ReadonlyArray<{ value: T; weight: number }>): T {
  const total = options.reduce((sum, o) => sum + o.weight, 0)
  let roll = random() * total
  for (const option of options) {
    if (roll < option.weight) return option.value
    roll -= option.weight
  }
  const last = options[options.length - 1]
  if (last === undefined) throw new Error('weightedArrayElement: empty options')
  return last.value
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

export interface MockDataset {
  workshops: Workshop[]
  machines: Machine[]
  products: Product[]
  orders: Order[]
  assignments: ScheduleAssignment[]
  downtimeRules: DowntimeRule[]
  /** История заказов (кто/что/когда) — см. entities/order/model/event-types. */
  orderEvents: OrderEvent[]
  /** Даты (yyyy-MM-dd), вручную переключённые относительно дефолтного статуса будни/выходной. */
  holidayOverrides: Set<string>
  shifts: Shift[]
  workCalendar: WorkCalendarSettings
  roles: Role[]
  groups: Group[]
  teamMembers: TeamMember[]
  notificationChannels: NotificationChannel[]
  notificationRules: NotificationRule[]
  notificationTemplates: NotificationTemplate[]
  apiKeys: ApiKey[]
  webhooks: Webhook[]
  integrations: ExternalIntegration[]
  generatedAt: string
}

/** Пишет запись в историю заказа — вызывается из моков при каждой мутации, влияющей на заказ. */
export function logOrderEvent(dataset: MockDataset, event: Omit<OrderEvent, 'id'>): void {
  dataset.orderEvents.push({ id: `oe-${dataset.orderEvents.length + 1}-${Date.now()}`, ...event })
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

const MACHINES_PER_GROUP = 2

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
      const prefix = arrayElement(group.namePrefixes)
      const code = randomInt({ min: 100, max: 999 })
      const status = weightedArrayElement<MachineStatus>([
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
        capacityPerHour: randomInt({ min: group.capacityRange[0], max: group.capacityRange[1] }),
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
  return weightedArrayElement<OrderPriority>([
    { value: 'low', weight: 3 },
    { value: 'normal', weight: 5 },
    { value: 'high', weight: 2.5 },
    { value: 'critical', weight: 1 },
  ])
}

function pickBaseStatus(isPast: boolean): OrderStatus {
  if (isPast) {
    return weightedArrayElement<OrderStatus>([
      { value: 'done', weight: 9 },
      { value: 'overdue', weight: 1 },
    ])
  }
  return weightedArrayElement<OrderStatus>([
    { value: 'planned', weight: 6 },
    { value: 'in_progress', weight: 3 },
  ])
}

/** Идём по таймлайну каждого станка вперёд, чередуя назначения и простои. */
function buildScheduleAndOrders(
  machines: Machine[],
  products: Product[],
  now: Date,
): { orders: Order[]; assignments: ScheduleAssignment[]; events: OrderEvent[] } {
  const rangeStart = now.getTime() + RANGE_START_DAYS * DAY
  // TODO(temp/manual-testing): пусто с 6 числа текущего месяца — чтобы вручную
  // потыкать создание/перенос заказов на чистом холсте. Убрать перед демо/коммитом.
  const manualTestCutoff = new Date(now.getFullYear(), now.getMonth(), 6, 0, 0, 0, 0)
  if (manualTestCutoff.getTime() <= now.getTime()) manualTestCutoff.setMonth(manualTestCutoff.getMonth() + 1)
  const rangeEnd = Math.min(now.getTime() + RANGE_END_DAYS * DAY, manualTestCutoff.getTime())

  const orders: Order[] = []
  const assignments: ScheduleAssignment[] = []
  const events: OrderEvent[] = []
  let orderSeq = 1000
  // Safety net only — the real stop condition is cursor >= rangeEnd. Min step per
  // iteration is a 2h assignment with no gap, so rangeEnd is always reached well
  // before this many iterations; without it a bug in the advance logic could hang.
  const maxAssignmentsPerMachine = 5000

  for (const machine of machines) {
    const productsForGroup = products.filter((p) => p.techMap.machineGroupId === machine.groupId)
    if (productsForGroup.length === 0) continue

    let cursor = rangeStart + randomInt({ min: 0, max: 6 }) * HOUR

    for (let i = 0; i < maxAssignmentsPerMachine && cursor < rangeEnd; i++) {
      // Заметные окна простоя между заказами — по паре задач в день на станок, а не сплошная стена блоков.
      const gapHours = weightedArrayElement([
        { value: randomInt({ min: 2, max: 6 }), weight: 3 },
        { value: randomInt({ min: 6, max: 14 }), weight: 3 },
        { value: randomInt({ min: 14, max: 24 }), weight: 1 },
      ])
      cursor += gapHours * HOUR
      if (cursor >= rangeEnd) break

      const durationHours = randomInt({ min: 2, max: 6 })
      const startAt = new Date(cursor)
      const endAt = new Date(cursor + durationHours * HOUR)
      cursor = endAt.getTime()

      const product = arrayElement(productsForGroup)
      const quantity = Math.round(durationHours * product.techMap.outputPerHour)
      const isPast = endAt.getTime() < now.getTime()

      orderSeq += 1
      const orderId = `o-${orderSeq}`
      const code = `WO-${startAt.getFullYear()}-${orderSeq}`

      const deadlineSlackHours = weightedArrayElement([
        { value: randomInt({ min: 12, max: 72 }), weight: 6 },
        { value: randomInt({ min: -12, max: 4 }), weight: 1 },
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

      events.push({
        id: `oe-seed-${orderSeq}`,
        orderId,
        type: 'created',
        at: startAt.toISOString(),
        machineName: machine.name,
      })
    }
  }

  return { orders, assignments, events }
}

function buildDowntimeRules(machines: Machine[], now: Date): DowntimeRule[] {
  const rules: DowntimeRule[] = []
  let seq = 1
  for (const machine of machines) {
    const count = machine.status === 'down' ? 2 : randomInt({ min: 0, max: 1 })
    for (let i = 0; i < count; i++) {
      const dayOffset = randomInt({ min: -5, max: 30 })
      const startHour = randomInt({ min: 0, max: 20 })
      const start = new Date(now)
      start.setDate(start.getDate() + dayOffset)
      start.setHours(startHour, 0, 0, 0)
      const durationHours = randomInt({ min: 2, max: 6 })
      const end = new Date(start.getTime() + durationHours * HOUR)
      rules.push({
        id: `dt-${seq++}`,
        machineId: machine.id,
        recurrence: 'once',
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        reason: arrayElement(DOWNTIME_REASONS),
      })
    }
  }
  return rules
}

/**
 * Снимает с графика назначения станка `machineId`, пересекающие [windowStart, windowEnd),
 * и помечает их заказы статусом "нуждается в переназначении". Уже выполненные заказы —
 * исторический факт, простой/ТО или смена группы задним числом их не трогает вовсе
 * (skipDone), а вот полное удаление станка забирает и их — оставлять назначение на
 * несуществующий станок нельзя.
 * Используется и при добавлении простоя/ТО (окно = сам простой), и при удалении станка
 * (окно = вся временная ось, т.е. -Infinity..Infinity, skipDone: false).
 */
export function cascadeUnassign(
  dataset: MockDataset,
  machineId: string,
  windowStart: number,
  windowEnd: number,
  options: { skipDone?: boolean; reason?: string } = {},
): number {
  const skipDone = options.skipDone ?? true
  const reason = options.reason ?? 'Снято с графика'
  const machineName = dataset.machines.find((m) => m.id === machineId)?.name
  let affected = 0
  const ordersById = new Map(dataset.orders.map((o) => [o.id, o]))
  dataset.assignments = dataset.assignments.filter((a) => {
    if (a.machineId !== machineId) return true
    const aStart = new Date(a.startAt).getTime()
    const aEnd = new Date(a.endAt).getTime()
    if (!(aStart < windowEnd && aEnd > windowStart)) return true

    const order = ordersById.get(a.orderId)
    if (skipDone && order?.status === 'done') return true

    if (order) order.status = 'needs_reassignment'
    logOrderEvent(dataset, { orderId: a.orderId, type: 'unassigned', at: new Date().toISOString(), machineName, reason })
    affected += 1
    return false
  })
  return affected
}

function buildShifts(): Shift[] {
  return [
    { id: 'shift-a', name: 'Смена А (Основная)', color: '#2563eb', startTime: '08:00', endTime: '17:00', breakStart: '12:00', breakEnd: '12:30' },
    { id: 'shift-b', name: 'Смена Б (Вечерняя)', color: '#16a34a', startTime: '16:00', endTime: '00:00', breakStart: '20:00', breakEnd: '20:30' },
    { id: 'shift-c', name: 'Смена В (Ночная)', color: '#f59e0b', startTime: '00:00', endTime: '08:00', breakStart: '03:30', breakEnd: '04:00' },
  ]
}

function buildWorkCalendar(): WorkCalendarSettings {
  return { workingDays: [0, 1, 2, 3, 4] }
}

function buildRoles(): Role[] {
  const allKeys = PERMISSIONS.map((p) => p.key)
  return [
    { id: 'admin', name: 'Администратор', color: 'var(--color-priority-critical)', bg: 'var(--color-priority-critical-bg)', permissions: allKeys },
    { id: 'planner', name: 'Планировщик', color: 'var(--color-brand-600)', bg: 'var(--color-brand-50)', permissions: ['planning', 'bulk_edit', 'analytics', 'export', 'machines'] },
    { id: 'operator', name: 'Оператор', color: 'var(--color-priority-normal)', bg: 'var(--color-priority-normal-bg)', permissions: ['planning', 'analytics'] },
    { id: 'viewer', name: 'Просмотр', color: 'var(--color-ink-600)', bg: 'var(--color-canvas)', permissions: ['analytics'] },
  ]
}

function buildTeamMembers(): TeamMember[] {
  return [
    { id: 'tm-1', name: 'Иван Петров', email: 'i.petrov@company.ru', phone: '+7 (900) 111-11-11', roleId: 'planner', groupIds: ['grp-planning'], status: 'active' },
    { id: 'tm-2', name: 'Ольга Смирнова', email: 'o.smirnova@company.ru', phone: '+7 (900) 222-22-22', roleId: 'admin', groupIds: ['grp-admin'], status: 'active' },
    { id: 'tm-3', name: 'Дмитрий Кузнецов', email: 'd.kuznetsov@company.ru', phone: '+7 (900) 333-33-33', roleId: 'viewer', groupIds: ['grp-shop1'], status: 'active' },
    { id: 'tm-4', name: 'Анна Волкова', email: 'a.volkova@company.ru', phone: '+7 (900) 444-44-44', roleId: 'operator', groupIds: ['grp-shop1'], status: 'active' },
    { id: 'tm-5', name: 'Сергей Иванов', email: 's.ivanov@company.ru', phone: '+7 (900) 555-55-55', roleId: 'operator', groupIds: ['grp-shop2'], status: 'active' },
    { id: 'tm-6', name: 'Мария Новикова', email: 'm.novikova@company.ru', phone: '+7 (900) 666-66-66', roleId: 'planner', groupIds: ['grp-planning'], status: 'invited' },
    { id: 'tm-7', name: 'Павел Соколов', email: 'p.sokolov@company.ru', phone: '+7 (900) 777-77-77', roleId: 'viewer', groupIds: ['grp-shop2'], status: 'disabled' },
    { id: 'tm-8', name: 'Екатерина Морозова', email: 'e.morozova@company.ru', phone: '+7 (900) 888-88-88', roleId: 'operator', groupIds: ['grp-shop1'], status: 'active' },
  ]
}

function buildGroups(): Group[] {
  return [
    { id: 'grp-admin', name: 'Администрация', memberIds: ['tm-2'] },
    { id: 'grp-planning', name: 'Плановый отдел', memberIds: ['tm-1', 'tm-6'] },
    { id: 'grp-shop1', name: 'Цех №1 — Металлообработка', memberIds: ['tm-3', 'tm-4', 'tm-8'] },
    { id: 'grp-shop2', name: 'Цех №2 — Покраска', memberIds: ['tm-5', 'tm-7'] },
  ]
}

function buildNotificationChannels(): NotificationChannel[] {
  return [
    { id: 'ch-email', type: 'email', name: 'Email', enabled: true, target: 'notify@company.ru' },
    { id: 'ch-push', type: 'push', name: 'Push-уведомления', enabled: true, target: '—' },
    { id: 'ch-sms', type: 'sms', name: 'SMS', enabled: false, target: '+7 (900) 000-00-00' },
    { id: 'ch-telegram', type: 'telegram', name: 'Telegram', enabled: true, target: '@taktgrid_bot' },
  ]
}

function buildNotificationRules(): NotificationRule[] {
  return [
    { id: 'rule-1', event: 'order_at_risk', label: 'Риск срыва дедлайна заказа', channelIds: ['ch-email', 'ch-push', 'ch-telegram'], enabled: true, thresholdHours: 6 },
    { id: 'rule-2', event: 'order_overdue', label: 'Заказ просрочен', channelIds: ['ch-email', 'ch-push', 'ch-telegram'], enabled: true },
    { id: 'rule-3', event: 'machine_down', label: 'Авария станка', channelIds: ['ch-email', 'ch-push', 'ch-sms', 'ch-telegram'], enabled: true },
    { id: 'rule-4', event: 'machine_downtime_scheduled', label: 'Плановый простой/ТО станка', channelIds: ['ch-email'], enabled: true },
    { id: 'rule-5', event: 'conflict_detected', label: 'Обнаружен конфликт в графике', channelIds: ['ch-push', 'ch-telegram'], enabled: true },
    { id: 'rule-6', event: 'order_created', label: 'Новый заказ создан', channelIds: ['ch-push'], enabled: false },
    { id: 'rule-7', event: 'order_completed', label: 'Заказ выполнен', channelIds: ['ch-email'], enabled: false },
    { id: 'rule-8', event: 'assignment_reassigned', label: 'Назначение перенесено', channelIds: ['ch-push'], enabled: true },
    { id: 'rule-9', event: 'defect_rate_exceeded', label: 'Превышен процент брака', channelIds: ['ch-email', 'ch-telegram'], enabled: true },
    { id: 'rule-10', event: 'shift_not_filled', label: 'Смена не укомплектована', channelIds: ['ch-push', 'ch-sms'], enabled: false },
    { id: 'rule-11', event: 'nightly_report', label: 'Ночной сводный отчёт', channelIds: ['ch-email'], enabled: false },
    { id: 'rule-12', event: 'new_user_invited', label: 'Приглашён новый пользователь', channelIds: ['ch-email'], enabled: true },
  ]
}

function buildNotificationTemplates(): NotificationTemplate[] {
  return [
    { id: 'tmpl-1', event: 'order_at_risk', name: 'Риск срыва дедлайна', subject: 'Заказ {{order_code}} под угрозой срыва', body: 'Заказ {{order_code}} должен быть завершён до {{deadline}}, но по текущему графику не укладывается. Проверьте назначение.' },
    { id: 'tmpl-2', event: 'order_overdue', name: 'Заказ просрочен', subject: 'Заказ {{order_code}} просрочен', body: 'Срок исполнения заказа {{order_code}} истёк {{deadline}}. Требуется немедленное решение.' },
    { id: 'tmpl-3', event: 'machine_down', name: 'Авария станка', subject: 'Авария: {{machine_name}}', body: 'Станок {{machine_name}} перешёл в статус "Авария". Затронуто заказов: {{affected_orders}}.' },
    { id: 'tmpl-4', event: 'conflict_detected', name: 'Конфликт в графике', subject: 'Конфликт в графике на {{machine_name}}', body: 'Обнаружено пересечение назначений на станке {{machine_name}} в интервале {{time_range}}.' },
    { id: 'tmpl-5', event: 'order_completed', name: 'Заказ выполнен', subject: 'Заказ {{order_code}} выполнен', body: 'Заказ {{order_code}} успешно завершён на станке {{machine_name}}.' },
    { id: 'tmpl-6', event: 'defect_rate_exceeded', name: 'Превышен брак', subject: 'Брак превышен на {{machine_name}}', body: 'На станке {{machine_name}} зафиксирован процент брака выше допустимого порога.' },
    { id: 'tmpl-7', event: 'nightly_report', name: 'Ночной отчёт', subject: 'Сводка за {{date}}', body: 'Ежедневная сводка по выполнению плана за {{date}} во вложении.' },
    { id: 'tmpl-8', event: 'new_user_invited', name: 'Приглашение пользователя', subject: 'Вас пригласили в TaktGrid', body: 'Здравствуйте, {{user_name}}! Для вас создана учётная запись в TaktGrid с ролью «{{role_name}}».' },
  ]
}

function buildApiKeys(now: Date): ApiKey[] {
  return [
    { id: 'key-1', label: 'Продакшн интеграция', tokenMasked: 'tg_live_••••••••a41c', createdAt: new Date(now.getTime() - 30 * DAY).toISOString() },
    { id: 'key-2', label: 'Тестовый ключ', tokenMasked: 'tg_test_••••••••7b02', createdAt: new Date(now.getTime() - 5 * DAY).toISOString() },
  ]
}

function buildWebhooks(now: Date): Webhook[] {
  return [
    { id: 'wh-1', url: 'https://erp.company.ru/hooks/taktgrid', event: 'order.completed', enabled: true, createdAt: new Date(now.getTime() - 20 * DAY).toISOString() },
    { id: 'wh-2', url: 'https://warehouse.company.ru/api/sync', event: 'order.created', enabled: false, createdAt: new Date(now.getTime() - 12 * DAY).toISOString() },
  ]
}

function buildIntegrations(now: Date): ExternalIntegration[] {
  return [
    { id: 'int-1c', name: '1С:Предприятие', description: 'Синхронизация заказов и остатков', status: 'connected', connectedAt: new Date(now.getTime() - 90 * DAY).toISOString() },
    { id: 'int-telegram', name: 'Telegram Bot', description: 'Уведомления в чат цеха', status: 'connected', connectedAt: new Date(now.getTime() - 60 * DAY).toISOString() },
    { id: 'int-smtp', name: 'SMTP-сервер', description: 'Исходящая почта для уведомлений', status: 'connected', connectedAt: new Date(now.getTime() - 60 * DAY).toISOString() },
    { id: 'int-wms', name: 'Внешний склад (WMS)', description: 'Обмен остатками с внешним складом', status: 'disconnected', connectedAt: null },
  ]
}

let cached: MockDataset | null = null

export function getMockDataset(): MockDataset {
  if (cached) return cached

  const now = new Date()
  const workshops = buildWorkshops()
  const machines = buildMachines(workshops)
  const products = buildProducts()
  const { orders, assignments, events } = buildScheduleAndOrders(machines, products, now)
  const downtimeRules = buildDowntimeRules(machines, now)

  cached = {
    workshops,
    machines,
    products,
    orders,
    assignments,
    downtimeRules,
    orderEvents: events,
    holidayOverrides: new Set(),
    shifts: buildShifts(),
    workCalendar: buildWorkCalendar(),
    roles: buildRoles(),
    groups: buildGroups(),
    teamMembers: buildTeamMembers(),
    notificationChannels: buildNotificationChannels(),
    notificationRules: buildNotificationRules(),
    notificationTemplates: buildNotificationTemplates(),
    apiKeys: buildApiKeys(now),
    webhooks: buildWebhooks(now),
    integrations: buildIntegrations(now),
    generatedAt: now.toISOString(),
  }
  return cached
}
