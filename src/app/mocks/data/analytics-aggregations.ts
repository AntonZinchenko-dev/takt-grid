import type { MockDataset } from './generate-mock-data'
import type { AnalyticsSummary } from '@/pages/analytics'
import { DAY, dayBounds, busyHoursInRange, overlapHours, hashString } from './time-helpers'

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export function buildAnalyticsSummary(dataset: MockDataset, now: Date, days: number): AnalyticsSummary {
  const { machines, orders, downtimeRules } = dataset
  const groups = [...new Map(machines.map((m) => [m.groupId, m.groupName])).entries()]
  const machineIdsByGroup = new Map<string, Set<string>>()
  for (const m of machines) {
    if (!machineIdsByGroup.has(m.groupId)) machineIdsByGroup.set(m.groupId, new Set())
    machineIdsByGroup.get(m.groupId)!.add(m.id)
  }

  const todayStart = dayBounds(now).start
  const rangeStart = todayStart - (days - 1) * DAY

  const groupLoadByDay = groups.map(([groupId, groupName]) => {
    const ids = machineIdsByGroup.get(groupId) ?? new Set<string>()
    const daysArr = Array.from({ length: days }, (_, i) => {
      const dayStart = rangeStart + i * DAY
      const busy = busyHoursInRange(dataset, ids, dayStart, dayStart + DAY)
      const percent = Math.round((busy / (ids.size * 24)) * 100)
      const d = new Date(dayStart)
      return {
        date: d.toISOString(),
        label: `${WEEKDAY_LABELS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`,
        percent: Math.min(100, percent),
      }
    })
    return { groupId, groupName, days: daysArr }
  })

  const outputTrend = Array.from({ length: days }, (_, i) => {
    const dayStart = rangeStart + i * DAY
    const dayAssignments = dataset.assignments.filter((a) => {
      const t = new Date(a.startAt).getTime()
      return t >= dayStart && t < dayStart + DAY
    })
    const plan = dayAssignments.reduce((sum, a) => sum + a.plannedQuantity, 0)
    const jitter = 0.85 + (hashString(`${dayStart}`) % 21) / 100
    const isPast = dayStart + DAY < now.getTime()
    const fact = isPast ? Math.round(plan * jitter) : Math.round(plan * Math.min(1, jitter + 0.05))
    const d = new Date(dayStart)
    return { date: d.toISOString(), label: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`, plan, fact }
  })

  const downtimeTrend = Array.from({ length: days }, (_, i) => {
    const dayStart = rangeStart + i * DAY
    const breakdown: Record<string, number> = {}
    for (const r of downtimeRules) {
      const overlap = overlapHours(new Date(r.startAt).getTime(), new Date(r.endAt).getTime(), dayStart, dayStart + DAY)
      if (overlap > 0) breakdown[r.reason] = (breakdown[r.reason] ?? 0) + Math.round(overlap)
    }
    const d = new Date(dayStart)
    return { date: d.toISOString(), label: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`, breakdown }
  })

  const totalOutput = outputTrend.reduce((sum, p) => sum + p.fact, 0)
  const totalDowntimeHours = downtimeTrend.reduce((sum, p) => sum + Object.values(p.breakdown).reduce((s, v) => s + v, 0), 0)
  const overdueCount = orders.filter((o) => o.status === 'overdue').length
  const avgLoadPercent = Math.round(
    groupLoadByDay.reduce((sum, row) => sum + row.days.reduce((s, d) => s + d.percent, 0) / row.days.length, 0) / (groupLoadByDay.length || 1),
  )

  return { days, groupLoadByDay, outputTrend, downtimeTrend, totals: { totalOutput, totalDowntimeHours, overdueCount, avgLoadPercent } }
}
