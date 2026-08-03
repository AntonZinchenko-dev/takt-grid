import type { MockDataset } from './generate-mock-data'
import type { DashboardSummary } from '@/pages/dashboard'
import type { OrderPriority } from '@/entities/order'
import { HOUR, DAY, hashString, dayBounds, overlapHours, busyHoursInRange } from './time-helpers'

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export function buildDashboardSummary(dataset: MockDataset, now: Date): DashboardSummary {
  const { machines, orders, assignments, downtimeRules } = dataset
  const groups = [...new Map(machines.map((m) => [m.groupId, m.groupName])).entries()]
  const machineIdsByGroup = new Map<string, Set<string>>()
  for (const m of machines) {
    if (!machineIdsByGroup.has(m.groupId)) machineIdsByGroup.set(m.groupId, new Set())
    machineIdsByGroup.get(m.groupId)!.add(m.id)
  }
  const allMachineIds = new Set(machines.map((m) => m.id))

  // ---- KPI: сегодня / вчера / неделя ----
  const today = dayBounds(now)
  const yesterday = dayBounds(new Date(now.getTime() - DAY))
  const weekStart = today.start - 6 * DAY

  const todayBusy = busyHoursInRange(dataset, allMachineIds, today.start, today.end)
  const yesterdayBusy = busyHoursInRange(dataset, allMachineIds, yesterday.start, yesterday.end)
  const weekBusy = busyHoursInRange(dataset, allMachineIds, weekStart, today.end)
  const prevWeekBusy = busyHoursInRange(dataset, allMachineIds, weekStart - 7 * DAY, weekStart)

  const overallLoadPercent = Math.round((todayBusy / (machines.length * 24)) * 100)
  const yesterdayLoadPercent = Math.round((yesterdayBusy / (machines.length * 24)) * 100)
  const weekLoadPercent = Math.round((weekBusy / (machines.length * 24 * 7)) * 100)
  const prevWeekLoadPercent = Math.round((prevWeekBusy / (machines.length * 24 * 7)) * 100)

  const ordersAtRisk = orders.filter((o) => o.status === 'at_risk').length
  const activeOrders = orders.filter((o) => o.status === 'planned' || o.status === 'in_progress').length

  let freeSlotsToday = 0
  for (const machine of machines) {
    const todays = assignments
      .filter((a) => a.machineId === machine.id)
      .filter((a) => new Date(a.startAt).getTime() < today.end && new Date(a.endAt).getTime() > today.start)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

    let cursor = today.start
    for (const a of todays) {
      const start = Math.max(new Date(a.startAt).getTime(), today.start)
      if (start - cursor >= 2 * HOUR) freeSlotsToday += 1
      cursor = Math.max(cursor, Math.min(new Date(a.endAt).getTime(), today.end))
    }
    if (today.end - cursor >= 2 * HOUR) freeSlotsToday += 1
  }

  // ---- Загрузка по группам за 7 дней (Пн-Вс текущей недели) ----
  const mondayOffset = (now.getDay() + 6) % 7
  const weekMonday = dayBounds(new Date(now.getTime() - mondayOffset * DAY)).start

  const groupLoadByDay = groups.map(([groupId, groupName]) => {
    const ids = machineIdsByGroup.get(groupId) ?? new Set<string>()
    const days = Array.from({ length: 7 }, (_, i) => {
      const dayStart = weekMonday + i * DAY
      const busy = busyHoursInRange(dataset, ids, dayStart, dayStart + DAY)
      const percent = Math.round((busy / (ids.size * 24)) * 100)
      const d = new Date(dayStart)
      return {
        date: d.toISOString(),
        label: `${WEEKDAY_LABELS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        percent: Math.min(100, percent),
      }
    })
    return { groupId, groupName, days }
  })

  // ---- Распределение загрузки по группам сегодня (донат) ----
  const groupBusyToday = groups.map(([groupId, groupName]) => {
    const ids = machineIdsByGroup.get(groupId) ?? new Set<string>()
    return { groupId, groupName, busy: busyHoursInRange(dataset, ids, today.start, today.end) }
  })
  const totalBusyToday = groupBusyToday.reduce((sum, g) => sum + g.busy, 0) || 1
  const groupDistribution = groupBusyToday.map((g) => ({
    groupId: g.groupId,
    groupName: g.groupName,
    percent: Math.round((g.busy / totalBusyToday) * 100),
  }))

  // ---- Заказы, требующие внимания ----
  const REASONS_AT_RISK = ['Риск срыва', 'Задержка поставки', 'Высокая загрузка станка']
  const productById = new Map(dataset.products.map((p) => [p.id, p]))
  const groupNameById = new Map(groups)

  const attentionOrders = orders
    .filter((o) => o.status === 'at_risk' || o.status === 'overdue')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 6)
    .map((o) => {
      const product = productById.get(o.productId)
      const groupName = product ? (groupNameById.get(product.techMap.machineGroupId) ?? '—') : '—'
      const reason = o.status === 'overdue' ? 'Просрочен' : REASONS_AT_RISK[hashString(o.id) % REASONS_AT_RISK.length]
      return {
        orderId: o.id,
        code: o.code,
        productName: o.productName,
        deadline: o.deadline,
        priority: o.priority,
        groupName,
        reason: reason ?? 'Риск срыва',
      }
    })

  // ---- Мини-гант на сегодня (по одному станку на группу) ----
  const orderById = new Map(orders.map((o) => [o.id, o]))
  const representativeMachines = groups
    .map(([groupId]) => machines.find((m) => m.groupId === groupId))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .slice(0, 6)

  const todayGantt = representativeMachines.map((machine) => {
    const dayAssignments = assignments
      .filter((a) => a.machineId === machine.id)
      .filter((a) => new Date(a.startAt).getTime() < today.end && new Date(a.endAt).getTime() > today.start)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

    const dayDowntime = downtimeRules
      .filter((r) => r.machineId === machine.id)
      .filter((r) => new Date(r.startAt).getTime() < today.end && new Date(r.endAt).getTime() > today.start)

    type Block = { startAt: string; endAt: string; kind: 'order' | 'idle' | 'downtime'; orderCode?: string; priority?: OrderPriority }
    const blocks: Block[] = []
    for (const a of dayAssignments) {
      const order = orderById.get(a.orderId)
      blocks.push({ startAt: a.startAt, endAt: a.endAt, kind: 'order', orderCode: order?.code, priority: order?.priority })
    }
    for (const r of dayDowntime) {
      blocks.push({ startAt: r.startAt, endAt: r.endAt, kind: 'downtime' })
    }
    blocks.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())

    // Заполняем простои между блоками, чтобы визуально не было дыр
    const filled: Block[] = []
    let cursor = today.start
    for (const b of blocks) {
      const s = Math.max(new Date(b.startAt).getTime(), today.start)
      if (s - cursor > 5 * 60_000) filled.push({ startAt: new Date(cursor).toISOString(), endAt: new Date(s).toISOString(), kind: 'idle' })
      filled.push(b)
      cursor = Math.max(cursor, Math.min(new Date(b.endAt).getTime(), today.end))
    }
    if (today.end - cursor > 5 * 60_000) {
      filled.push({ startAt: new Date(cursor).toISOString(), endAt: new Date(today.end).toISOString(), kind: 'idle' })
    }

    return { machineId: machine.id, machineName: machine.name, blocks: filled }
  })

  // ---- Выпуск план/факт и простои за 7 дней ----
  const outputTrend = Array.from({ length: 7 }, (_, i) => {
    const dayStart = weekMonday + i * DAY
    const dayAssignments = assignments.filter((a) => {
      const t = new Date(a.startAt).getTime()
      return t >= dayStart && t < dayStart + DAY
    })
    const plan = dayAssignments.reduce((sum, a) => sum + a.plannedQuantity, 0)
    const jitter = 0.85 + (hashString(`${dayStart}`) % 21) / 100 // 0.85..1.05, детерминированно
    const isPast = dayStart + DAY < now.getTime()
    const fact = isPast ? Math.round(plan * jitter) : Math.round(plan * Math.min(1, jitter + 0.05))
    const d = new Date(dayStart)
    return { date: d.toISOString(), label: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`, plan, fact }
  })

  const downtimeTrend = Array.from({ length: 7 }, (_, i) => {
    const dayStart = weekMonday + i * DAY
    const breakdown: Record<string, number> = {}
    for (const r of downtimeRules) {
      const overlap = overlapHours(new Date(r.startAt).getTime(), new Date(r.endAt).getTime(), dayStart, dayStart + DAY)
      if (overlap > 0) breakdown[r.reason] = (breakdown[r.reason] ?? 0) + Math.round(overlap)
    }
    const d = new Date(dayStart)
    return { date: d.toISOString(), label: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`, breakdown }
  })

  return {
    kpis: {
      overallLoadPercent,
      loadTrendPercent: overallLoadPercent - yesterdayLoadPercent,
      ordersAtRisk,
      freeSlotsToday,
      weekLoadPercent,
      weekLoadTrendPercent: weekLoadPercent - prevWeekLoadPercent,
      activeOrders,
    },
    groupLoadByDay,
    groupDistribution,
    attentionOrders,
    todayGantt,
    outputTrend,
    downtimeTrend,
  }
}
