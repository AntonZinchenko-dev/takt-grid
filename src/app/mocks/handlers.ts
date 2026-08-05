import { http, HttpResponse, delay } from 'msw'
import { getMockDataset, cascadeUnassign, logOrderEvent } from './data/generate-mock-data'
import { buildDashboardSummary } from './data/dashboard-aggregations'
import { buildAnalyticsSummary } from './data/analytics-aggregations'
import type { Order } from '@/entities/order'
import type { Machine } from '@/entities/machine'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import type { Shift, WorkCalendarSettings } from '@/entities/shift'
import type { Role, Group, TeamMember } from '@/entities/user'
import type { NotificationChannel, NotificationRule, NotificationTemplate } from '@/entities/notification-setting'
import type { ApiKey, Webhook } from '@/entities/integration'

const NETWORK_DELAY: [number, number] = [180, 420]

async function simulateNetwork() {
  const [min, max] = NETWORK_DELAY
  await delay(min + Math.random() * (max - min))
}

export const handlers = [
  http.get('/api/workshops', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().workshops)
  }),

  http.get('/api/machines', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().machines)
  }),

  /** Добавление станка со страницы "Станки и оборудование". */
  http.post('/api/machines', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as { name: string; workshopId: string; groupId: string; groupName: string; capacityPerHour: number }
    const dataset = getMockDataset()
    const seq = dataset.machines.length + 1 + Math.floor(Math.random() * 1000)
    const machine: Machine = {
      id: `m-new-${Date.now()}-${seq}`,
      name: body.name,
      workshopId: body.workshopId,
      groupId: body.groupId,
      groupName: body.groupName,
      status: 'running',
      capacityPerHour: body.capacityPerHour,
      order: dataset.machines.filter((m) => m.groupId === body.groupId).length + 1,
    }
    dataset.machines.push(machine)
    return HttpResponse.json(machine, { status: 201 })
  }),

  /**
   * Редактирование станка. Смена группы делает несовместимыми все текущие назначения,
   * чьи заказы требуют другую группу по техкарте продукта — они снимаются с графика
   * и помечаются "нуждается в переназначении", как и при простое/ТО.
   */
  http.patch('/api/machines/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<{
      name: string
      workshopId: string
      groupId: string
      groupName: string
      capacityPerHour: number
      status: Machine['status']
    }>
    const dataset = getMockDataset()
    const machine = dataset.machines.find((m) => m.id === params.id)
    if (!machine) {
      return HttpResponse.json({ message: 'Станок не найден' }, { status: 404 })
    }

    const groupChanging = body.groupId !== undefined && body.groupId !== machine.groupId

    if (body.name !== undefined) machine.name = body.name
    if (body.workshopId !== undefined) machine.workshopId = body.workshopId
    if (body.groupId !== undefined) machine.groupId = body.groupId
    if (body.groupName !== undefined) machine.groupName = body.groupName
    if (body.capacityPerHour !== undefined) machine.capacityPerHour = body.capacityPerHour
    if (body.status !== undefined) machine.status = body.status

    let unassignedCount = 0
    if (groupChanging) {
      const productsById = new Map(dataset.products.map((p) => [p.id, p]))
      const ordersById = new Map(dataset.orders.map((o) => [o.id, o]))
      dataset.assignments = dataset.assignments.filter((a) => {
        if (a.machineId !== machine.id) return true
        const order = ordersById.get(a.orderId)
        const product = order ? productsById.get(order.productId) : undefined
        if (product && product.techMap.machineGroupId === machine.groupId) return true
        if (order?.status === 'done') return true
        if (order) order.status = 'needs_reassignment'
        logOrderEvent(dataset, {
          orderId: a.orderId,
          type: 'unassigned',
          at: new Date().toISOString(),
          machineName: machine.name,
          reason: 'Смена группы станка',
        })
        unassignedCount += 1
        return false
      })
    }

    return HttpResponse.json({ machine, unassignedCount })
  }),

  /** Удаление станка — все его назначения снимаются с графика, заказы помечаются "нуждается в переназначении". */
  http.delete('/api/machines/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.machines.findIndex((m) => m.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ message: 'Станок не найден' }, { status: 404 })
    }

    const unassignedCount = cascadeUnassign(dataset, dataset.machines[index]!.id, -Infinity, Infinity, { skipDone: false, reason: 'Станок удалён' })
    dataset.machines.splice(index, 1)
    dataset.downtimeRules = dataset.downtimeRules.filter((r) => r.machineId !== params.id)
    return HttpResponse.json({ deleted: true, unassignedCount })
  }),

  http.get('/api/products', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().products)
  }),

  http.get('/api/downtime-rules', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().downtimeRules)
  }),

  /**
   * `page` присутствует → постранично: { items, total } (реестр заказов, см. OrdersPage).
   * Без `page` → плоский массив, обрезанный `limit` (внутренние выборки "весь датасет" —
   * ordersById в матрице, дашборд и т.п. — им общий счётчик не нужен, менять их ради него не стоит).
   */
  http.get('/api/orders', async ({ request }) => {
    await simulateNetwork()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')
    const search = url.searchParams.get('search')?.toLowerCase()

    let orders = getMockDataset().orders
    if (status) orders = orders.filter((o) => o.status === status)
    if (priority) orders = orders.filter((o) => o.priority === priority)
    if (search) {
      orders = orders.filter((o) => o.code.toLowerCase().includes(search) || o.productName.toLowerCase().includes(search))
    }

    const pageParam = url.searchParams.get('page')
    if (pageParam !== null) {
      const pageSize = Number(url.searchParams.get('pageSize') ?? '20')
      const page = Math.max(1, Number(pageParam))
      const start = (page - 1) * pageSize
      return HttpResponse.json({ items: orders.slice(start, start + pageSize), total: orders.length })
    }

    const limit = Number(url.searchParams.get('limit') ?? '200')
    return HttpResponse.json(orders.slice(0, limit))
  }),

  /** История заказа для отчёта — кто/что/когда, от новых событий к старым. */
  http.get('/api/orders/:id/events', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const events = dataset.orderEvents
      .filter((e) => e.orderId === params.id)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    return HttpResponse.json(events)
  }),

  /**
   * Окно назначений для матрицы — принципиально не отдаём весь массив разом.
   * Клиент запрашивает только видимый диапазон (+буфер), см. GridStore.
   */
  http.get('/api/assignments', async ({ request }) => {
    await simulateNetwork()
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) {
      return HttpResponse.json({ message: 'from/to обязательны' }, { status: 400 })
    }
    const fromMs = new Date(from).getTime()
    const toMs = new Date(to).getTime()

    const assignments = getMockDataset().assignments.filter((a) => {
      const s = new Date(a.startAt).getTime()
      const e = new Date(a.endAt).getTime()
      return e > fromMs && s < toMs
    })
    return HttpResponse.json(assignments)
  }),

  http.get('/api/dashboard/summary', async () => {
    await simulateNetwork()
    const dataset = getMockDataset()
    return HttpResponse.json(buildDashboardSummary(dataset, new Date()))
  }),

  http.get('/api/analytics/summary', async ({ request }) => {
    await simulateNetwork()
    const url = new URL(request.url)
    const days = Number(url.searchParams.get('days') ?? '30')
    const dataset = getMockDataset()
    return HttpResponse.json(buildAnalyticsSummary(dataset, new Date(), days))
  }),

  /**
   * Назначение станка/времени существующему заказу без назначения — заказ, снятый
   * с графика простоем/ТО или сменой группы станка, возвращается в работу отсюда
   * (мини-мастер переназначения в матрице), а не через мастер создания нового заказа.
   */
  http.post('/api/assignments', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as { orderId: string; machineId: string; startAt: string; endAt: string; plannedQuantity: number }
    const dataset = getMockDataset()
    const order = dataset.orders.find((o) => o.id === body.orderId)
    if (!order) {
      return HttpResponse.json({ message: 'Заказ не найден' }, { status: 404 })
    }

    const newStart = new Date(body.startAt).getTime()
    const newEnd = new Date(body.endAt).getTime()
    const conflict = dataset.assignments.find(
      (a) => a.machineId === body.machineId && new Date(a.startAt).getTime() < newEnd && new Date(a.endAt).getTime() > newStart,
    )
    if (conflict) {
      return HttpResponse.json({ message: 'Станок занят в это время — обновите список слотов' }, { status: 409 })
    }

    const assignment: ScheduleAssignment = {
      id: `a-new-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: body.orderId,
      machineId: body.machineId,
      startAt: body.startAt,
      endAt: body.endAt,
      plannedQuantity: body.plannedQuantity,
    }
    dataset.assignments.push(assignment)
    if (order.status === 'needs_reassignment') order.status = 'planned'

    const newMachine = dataset.machines.find((m) => m.id === body.machineId)
    logOrderEvent(dataset, { orderId: body.orderId, type: 'reassigned', at: new Date().toISOString(), machineName: newMachine?.name })

    return HttpResponse.json(assignment, { status: 201 })
  }),

  /**
   * Перенос назначения (drag в матрице). Сервер тоже проверяет занятость —
   * клиентская live-проверка при драге ускоряет отклик, но не заменяет истину.
   */
  http.patch('/api/assignments/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<{
      machineId: string
      startAt: string
      endAt: string
      actualQuantity: number
      defectQuantity: number
      shiftNumber: number
    }>
    const dataset = getMockDataset()
    const assignment = dataset.assignments.find((a) => a.id === params.id)
    if (!assignment) {
      return HttpResponse.json({ message: 'Назначение не найдено' }, { status: 404 })
    }

    if (body.machineId !== undefined && body.startAt !== undefined && body.endAt !== undefined) {
      const newStart = new Date(body.startAt).getTime()
      const newEnd = new Date(body.endAt).getTime()
      const conflict = dataset.assignments.find(
        (a) =>
          a.id !== assignment.id &&
          a.machineId === body.machineId &&
          new Date(a.startAt).getTime() < newEnd &&
          new Date(a.endAt).getTime() > newStart,
      )
      if (conflict) {
        return HttpResponse.json({ message: 'Станок занят в это время' }, { status: 409 })
      }

      const fromMachineName = dataset.machines.find((m) => m.id === assignment.machineId)?.name
      const toMachineName = dataset.machines.find((m) => m.id === body.machineId)?.name

      assignment.machineId = body.machineId
      assignment.startAt = body.startAt
      assignment.endAt = body.endAt

      logOrderEvent(dataset, {
        orderId: assignment.orderId,
        type: 'moved',
        at: new Date().toISOString(),
        machineName: toMachineName,
        fromMachineName,
      })
    }

    if (body.actualQuantity !== undefined) {
      assignment.actualQuantity = body.actualQuantity
    }
    if (body.defectQuantity !== undefined) {
      assignment.defectQuantity = body.defectQuantity
    }
    if (body.shiftNumber !== undefined) {
      assignment.shiftNumber = body.shiftNumber
    }
    if (body.actualQuantity !== undefined || body.defectQuantity !== undefined) {
      logOrderEvent(dataset, {
        orderId: assignment.orderId,
        type: 'result',
        at: new Date().toISOString(),
        machineName: dataset.machines.find((m) => m.id === assignment.machineId)?.name,
        actualQuantity: assignment.actualQuantity,
        defectQuantity: assignment.defectQuantity,
        shiftNumber: assignment.shiftNumber,
      })
    }

    return HttpResponse.json(assignment)
  }),

  /**
   * Снимает назначение без удаления заказа (в отличие от DELETE /api/orders/:id) — заказ
   * возвращается в "нуждается в переназначении". Нужно для отмены (undo) авто-расстановки:
   * пересоздание заказа дало бы новый id, а тут identity заказа сохраняется.
   */
  http.delete('/api/assignments/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.assignments.findIndex((a) => a.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ message: 'Назначение не найдено' }, { status: 404 })
    }
    const [assignment] = dataset.assignments.splice(index, 1)
    const order = dataset.orders.find((o) => o.id === assignment!.orderId)
    const machineName = dataset.machines.find((m) => m.id === assignment!.machineId)?.name
    if (order && order.status !== 'done') {
      order.status = 'needs_reassignment'
      logOrderEvent(dataset, { orderId: order.id, type: 'unassigned', at: new Date().toISOString(), machineName, reason: 'Отменено (undo)' })
    }
    return HttpResponse.json({ deleted: true })
  }),

  /** Bulk Edit — массовое изменение plannedQuantity по итогам формулы, посчитанной на клиенте (см. lib/bulk-formula.ts). */
  http.patch('/api/assignments/bulk', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as { updates: Array<{ id: string; plannedQuantity: number }> }
    const dataset = getMockDataset()
    const byId = new Map(dataset.assignments.map((a) => [a.id, a]))
    let updated = 0
    for (const u of body.updates) {
      const assignment = byId.get(u.id)
      if (assignment) {
        assignment.plannedQuantity = u.plannedQuantity
        updated += 1
      }
    }
    return HttpResponse.json({ updated })
  }),

  /** Мастер заказа — создаёт Order и сразу ScheduleAssignment на выбранный слот. */
  http.post('/api/orders', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as {
      productId: string
      quantity: number
      deadline: string
      priority: Order['priority']
      machineId: string
      startAt: string
      endAt: string
    }
    const dataset = getMockDataset()
    const product = dataset.products.find((p) => p.id === body.productId)
    if (!product) {
      return HttpResponse.json({ message: 'Продукт не найден' }, { status: 400 })
    }

    const newStart = new Date(body.startAt).getTime()
    const newEnd = new Date(body.endAt).getTime()
    const conflict = dataset.assignments.find(
      (a) => a.machineId === body.machineId && new Date(a.startAt).getTime() < newEnd && new Date(a.endAt).getTime() > newStart,
    )
    if (conflict) {
      return HttpResponse.json({ message: 'Станок занят в это время — обновите список слотов' }, { status: 409 })
    }

    const seq = dataset.orders.length + 1 + Math.floor(Math.random() * 1000)
    const orderId = `o-new-${Date.now()}-${seq}`
    const order: Order = {
      id: orderId,
      code: `WO-${new Date().getFullYear()}-${9000 + seq}`,
      productId: body.productId,
      productName: product.name,
      quantity: body.quantity,
      deadline: body.deadline,
      priority: body.priority,
      status: 'planned',
    }
    dataset.orders.push(order)
    dataset.assignments.push({
      id: `a-new-${Date.now()}-${seq}`,
      orderId,
      machineId: body.machineId,
      startAt: body.startAt,
      endAt: body.endAt,
      plannedQuantity: body.quantity,
    })

    const createdMachine = dataset.machines.find((m) => m.id === body.machineId)
    logOrderEvent(dataset, { orderId, type: 'created', at: new Date().toISOString(), machineName: createdMachine?.name })

    return HttpResponse.json(order, { status: 201 })
  }),

  /** Удаление заказа целиком вместе с его назначением в графике (массовое удаление в матрице). */
  http.delete('/api/orders/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.orders.findIndex((o) => o.id === params.id)
    if (index === -1) {
      return HttpResponse.json({ message: 'Заказ не найден' }, { status: 404 })
    }
    dataset.orders.splice(index, 1)
    dataset.assignments = dataset.assignments.filter((a) => a.orderId !== params.id)
    return HttpResponse.json({ deleted: true })
  }),

  /**
   * Добавление простоя/ТО станка со страницы "Станки и оборудование".
   * Заказы, чьи назначения пересеклись с новым простоем, снимаются с графика и
   * помечаются "нуждается в переназначении" — план и факт не должны расходиться молча.
   */
  http.post('/api/downtime-rules', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as { machineId: string; startAt: string; endAt: string; reason: string; recurrence: 'once' | 'daily' | 'weekly' }
    const dataset = getMockDataset()
    const rule = {
      id: `dt-new-${Date.now()}`,
      machineId: body.machineId,
      startAt: body.startAt,
      endAt: body.endAt,
      reason: body.reason,
      recurrence: body.recurrence,
    }
    dataset.downtimeRules.push(rule)
    const unassignedCount = cascadeUnassign(dataset, body.machineId, new Date(body.startAt).getTime(), new Date(body.endAt).getTime(), {
      reason: `Простой: ${body.reason}`,
    })
    return HttpResponse.json({ rule, unassignedCount }, { status: 201 })
  }),

  /** Дни, вручную переключённые относительно дефолтного статуса будни/выходной (вкладка "Календарь"). */
  http.get('/api/holidays', async () => {
    await simulateNetwork()
    return HttpResponse.json(Array.from(getMockDataset().holidayOverrides))
  }),

  http.post('/api/holidays/toggle', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as { date: string }
    const dataset = getMockDataset()
    let overridden: boolean
    if (dataset.holidayOverrides.has(body.date)) {
      dataset.holidayOverrides.delete(body.date)
      overridden = false
    } else {
      dataset.holidayOverrides.add(body.date)
      overridden = true
    }
    return HttpResponse.json({ date: body.date, overridden })
  }),

  /** Редактирование техкарты со страницы "Продукция и техкарты". */
  http.patch('/api/products/:id/tech-map', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as { outputPerHour: number; packageMultiplicity: number }
    const dataset = getMockDataset()
    const product = dataset.products.find((p) => p.id === params.id)
    if (!product) {
      return HttpResponse.json({ message: 'Продукт не найден' }, { status: 404 })
    }
    product.techMap.outputPerHour = body.outputPerHour
    product.techMap.packageMultiplicity = body.packageMultiplicity
    return HttpResponse.json(product)
  }),

  // ---- Настройки: Рабочий календарь ----

  http.get('/api/shifts', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().shifts)
  }),

  http.post('/api/shifts', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as Omit<Shift, 'id'>
    const dataset = getMockDataset()
    const shift: Shift = { id: `shift-new-${Date.now()}`, ...body }
    dataset.shifts.push(shift)
    return HttpResponse.json(shift, { status: 201 })
  }),

  http.patch('/api/shifts/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<Shift, 'id'>>
    const dataset = getMockDataset()
    const shift = dataset.shifts.find((s) => s.id === params.id)
    if (!shift) return HttpResponse.json({ message: 'Смена не найдена' }, { status: 404 })
    Object.assign(shift, body)
    return HttpResponse.json(shift)
  }),

  http.delete('/api/shifts/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.shifts.findIndex((s) => s.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Смена не найдена' }, { status: 404 })
    dataset.shifts.splice(index, 1)
    return HttpResponse.json({ deleted: true })
  }),

  http.get('/api/work-calendar', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().workCalendar)
  }),

  http.patch('/api/work-calendar', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as WorkCalendarSettings
    const dataset = getMockDataset()
    dataset.workCalendar = body
    return HttpResponse.json(dataset.workCalendar)
  }),

  // ---- Настройки: Пользователи и роли ----

  http.get('/api/roles', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().roles)
  }),

  http.post('/api/roles', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as Omit<Role, 'id'>
    const dataset = getMockDataset()
    const role: Role = { id: `role-new-${Date.now()}`, ...body }
    dataset.roles.push(role)
    return HttpResponse.json(role, { status: 201 })
  }),

  http.patch('/api/roles/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<Role, 'id'>>
    const dataset = getMockDataset()
    const role = dataset.roles.find((r) => r.id === params.id)
    if (!role) return HttpResponse.json({ message: 'Роль не найдена' }, { status: 404 })
    Object.assign(role, body)
    return HttpResponse.json(role)
  }),

  http.delete('/api/roles/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.roles.findIndex((r) => r.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Роль не найдена' }, { status: 404 })
    if (dataset.teamMembers.some((m) => m.roleId === params.id)) {
      return HttpResponse.json({ message: 'Роль назначена сотрудникам — сначала переназначьте их' }, { status: 409 })
    }
    dataset.roles.splice(index, 1)
    return HttpResponse.json({ deleted: true })
  }),

  http.get('/api/groups', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().groups)
  }),

  http.post('/api/groups', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as Omit<Group, 'id'>
    const dataset = getMockDataset()
    const group: Group = { id: `group-new-${Date.now()}`, ...body }
    dataset.groups.push(group)
    return HttpResponse.json(group, { status: 201 })
  }),

  http.patch('/api/groups/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<Group, 'id'>>
    const dataset = getMockDataset()
    const group = dataset.groups.find((g) => g.id === params.id)
    if (!group) return HttpResponse.json({ message: 'Группа не найдена' }, { status: 404 })
    Object.assign(group, body)
    return HttpResponse.json(group)
  }),

  http.delete('/api/groups/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.groups.findIndex((g) => g.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Группа не найдена' }, { status: 404 })
    dataset.groups.splice(index, 1)
    for (const member of dataset.teamMembers) {
      member.groupIds = member.groupIds.filter((id) => id !== params.id)
    }
    return HttpResponse.json({ deleted: true })
  }),

  http.get('/api/team-members', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().teamMembers)
  }),

  http.post('/api/team-members', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as Omit<TeamMember, 'id'>
    const dataset = getMockDataset()
    const member: TeamMember = { id: `tm-new-${Date.now()}`, ...body }
    dataset.teamMembers.push(member)
    return HttpResponse.json(member, { status: 201 })
  }),

  http.patch('/api/team-members/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<TeamMember, 'id'>>
    const dataset = getMockDataset()
    const member = dataset.teamMembers.find((m) => m.id === params.id)
    if (!member) return HttpResponse.json({ message: 'Сотрудник не найден' }, { status: 404 })
    Object.assign(member, body)
    return HttpResponse.json(member)
  }),

  http.delete('/api/team-members/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.teamMembers.findIndex((m) => m.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Сотрудник не найден' }, { status: 404 })
    dataset.teamMembers.splice(index, 1)
    for (const group of dataset.groups) {
      group.memberIds = group.memberIds.filter((id) => id !== params.id)
    }
    return HttpResponse.json({ deleted: true })
  }),

  // ---- Настройки: Уведомления ----

  http.get('/api/notification-channels', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().notificationChannels)
  }),

  http.patch('/api/notification-channels/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<NotificationChannel, 'id'>>
    const dataset = getMockDataset()
    const channel = dataset.notificationChannels.find((c) => c.id === params.id)
    if (!channel) return HttpResponse.json({ message: 'Канал не найден' }, { status: 404 })
    Object.assign(channel, body)
    return HttpResponse.json(channel)
  }),

  http.get('/api/notification-rules', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().notificationRules)
  }),

  http.patch('/api/notification-rules/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<NotificationRule, 'id'>>
    const dataset = getMockDataset()
    const rule = dataset.notificationRules.find((r) => r.id === params.id)
    if (!rule) return HttpResponse.json({ message: 'Правило не найдено' }, { status: 404 })
    Object.assign(rule, body)
    return HttpResponse.json(rule)
  }),

  http.get('/api/notification-templates', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().notificationTemplates)
  }),

  http.patch('/api/notification-templates/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<NotificationTemplate, 'id'>>
    const dataset = getMockDataset()
    const template = dataset.notificationTemplates.find((t) => t.id === params.id)
    if (!template) return HttpResponse.json({ message: 'Шаблон не найден' }, { status: 404 })
    Object.assign(template, body)
    return HttpResponse.json(template)
  }),

  // ---- Настройки: Интеграции ----

  http.get('/api/api-keys', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().apiKeys)
  }),

  http.post('/api/api-keys', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as { label: string }
    const dataset = getMockDataset()
    const token = crypto.randomUUID().replace(/-/g, '')
    const key: ApiKey = { id: `key-new-${Date.now()}`, label: body.label, tokenMasked: `tg_live_${token.slice(0, 8)}`, createdAt: new Date().toISOString() }
    dataset.apiKeys.push(key)
    return HttpResponse.json(key, { status: 201 })
  }),

  http.delete('/api/api-keys/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.apiKeys.findIndex((k) => k.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Ключ не найден' }, { status: 404 })
    dataset.apiKeys.splice(index, 1)
    return HttpResponse.json({ deleted: true })
  }),

  http.get('/api/webhooks', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().webhooks)
  }),

  http.post('/api/webhooks', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as { url: string; event: string }
    const dataset = getMockDataset()
    const webhook: Webhook = { id: `wh-new-${Date.now()}`, url: body.url, event: body.event, enabled: true, createdAt: new Date().toISOString() }
    dataset.webhooks.push(webhook)
    return HttpResponse.json(webhook, { status: 201 })
  }),

  http.patch('/api/webhooks/:id', async ({ request, params }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<Omit<Webhook, 'id'>>
    const dataset = getMockDataset()
    const webhook = dataset.webhooks.find((w) => w.id === params.id)
    if (!webhook) return HttpResponse.json({ message: 'Вебхук не найден' }, { status: 404 })
    Object.assign(webhook, body)
    return HttpResponse.json(webhook)
  }),

  http.delete('/api/webhooks/:id', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const index = dataset.webhooks.findIndex((w) => w.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Вебхук не найден' }, { status: 404 })
    dataset.webhooks.splice(index, 1)
    return HttpResponse.json({ deleted: true })
  }),

  http.get('/api/integrations', async () => {
    await simulateNetwork()
    return HttpResponse.json(getMockDataset().integrations)
  }),

  http.post('/api/integrations/:id/toggle', async ({ params }) => {
    await simulateNetwork()
    const dataset = getMockDataset()
    const integration = dataset.integrations.find((i) => i.id === params.id)
    if (!integration) return HttpResponse.json({ message: 'Интеграция не найдена' }, { status: 404 })
    if (integration.status === 'connected') {
      integration.status = 'disconnected'
      integration.connectedAt = null
    } else {
      integration.status = 'connected'
      integration.connectedAt = new Date().toISOString()
    }
    return HttpResponse.json(integration)
  }),

  /** Восстановление из резервной копии (вкладка "Система") — перезаписывает переданные срезы мок-датасета. */
  http.post('/api/system/restore', async ({ request }) => {
    await simulateNetwork()
    const body = (await request.json()) as Partial<{ machines: Machine[]; products: unknown[]; teamMembers: TeamMember[] }>
    const dataset = getMockDataset()
    if (body.machines) dataset.machines = body.machines
    if (body.teamMembers) dataset.teamMembers = body.teamMembers
    return HttpResponse.json({ restored: true })
  }),
]
