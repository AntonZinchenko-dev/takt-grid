import { http, HttpResponse, delay } from 'msw'
import { getMockDataset, cascadeUnassign, logOrderEvent } from './data/generate-mock-data'
import { buildDashboardSummary } from './data/dashboard-aggregations'
import { buildAnalyticsSummary } from './data/analytics-aggregations'
import type { Order } from '@/entities/order'
import type { Machine } from '@/entities/machine'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'

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
]
