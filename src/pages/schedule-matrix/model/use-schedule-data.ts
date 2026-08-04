import { useMemo } from 'react'
import { useWorkshopsQuery } from '@/entities/workshop'
import { useMachinesQuery, useDowntimeRulesQuery } from '@/entities/machine'
import type { DowntimeRule } from '@/entities/machine'
import { useOrdersQuery } from '@/entities/order'
import { useProductsQuery } from '@/entities/product'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import { DAY_MS } from '../lib/timeline'

const WINDOW_PAD_DAYS = 7

export function useScheduleData(anchorDate: Date) {
  const workshopsQuery = useWorkshopsQuery()
  const machinesQuery = useMachinesQuery()
  const downtimeQuery = useDowntimeRulesQuery()
  const productsQuery = useProductsQuery()
  // Полный список заказов — упрощение мок-слоя (см. ТЗ, известное ограничение этапа 1-2):
  // в проде это был бы постраничный запрос по machineId/дате, а не разовая выгрузка.
  // Лимит с запасом над объёмом мок-датасета (~22k заказов на диапазон -14..+90 дней) —
  // если лимит меньше реального количества, часть блоков в шахматке останется без заказа.
  const ordersQuery = useOrdersQuery({ limit: 30000 })

  const from = new Date(anchorDate.getTime() - WINDOW_PAD_DAYS * DAY_MS).toISOString()
  const to = new Date(anchorDate.getTime() + WINDOW_PAD_DAYS * DAY_MS).toISOString()
  const assignmentsQuery = useAssignmentsWindowQuery(from, to)

  const assignmentsByMachine = useMemo(() => {
    const map = new Map<string, ScheduleAssignment[]>()
    for (const a of assignmentsQuery.data ?? []) {
      const list = map.get(a.machineId) ?? []
      list.push(a)
      map.set(a.machineId, list)
    }
    for (const list of map.values()) list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    return map
  }, [assignmentsQuery.data])

  const assignmentsById = useMemo(() => new Map((assignmentsQuery.data ?? []).map((a) => [a.id, a])), [assignmentsQuery.data])

  /** Обратный поиск по заказу — для перехода из глобального поиска (см. SchedulePage) к его текущему назначению в гриде. */
  const assignmentByOrderId = useMemo(() => new Map((assignmentsQuery.data ?? []).map((a) => [a.orderId, a])), [assignmentsQuery.data])

  /** Переиспользуем протестированное ядро (см. shared/lib/occupancy-index) и для поиска блоков видимых в вьюпорте. */
  const occupancyIndex = useMemo(() => new OccupancyIndex(assignmentsQuery.data ?? []), [assignmentsQuery.data])

  const ordersById = useMemo(() => new Map((ordersQuery.data ?? []).map((o) => [o.id, o])), [ordersQuery.data])
  const productsById = useMemo(() => new Map((productsQuery.data ?? []).map((p) => [p.id, p])), [productsQuery.data])

  const downtimeByMachine = useMemo(() => {
    const map = new Map<string, DowntimeRule[]>()
    for (const r of downtimeQuery.data ?? []) {
      const list = map.get(r.machineId) ?? []
      list.push(r)
      map.set(r.machineId, list)
    }
    return map
  }, [downtimeQuery.data])

  return {
    workshops: workshopsQuery.data ?? [],
    machines: machinesQuery.data ?? [],
    products: productsQuery.data ?? [],
    assignmentsByMachine,
    assignmentsById,
    assignmentByOrderId,
    occupancyIndex,
    ordersById,
    productsById,
    downtimeByMachine,
    isLoading: workshopsQuery.isLoading || machinesQuery.isLoading || assignmentsQuery.isLoading,
    isReady: Boolean(workshopsQuery.data && machinesQuery.data),
  }
}
