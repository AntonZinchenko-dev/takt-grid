/**
 * Индекс занятости оборудования.
 *
 * Идея: назначения (ScheduleAssignment) на одном станке по определению
 * не должны пересекаться. Значит, если хранить их отсортированными по
 * времени начала, для проверки "свободен ли станок в интервале [start, end)"
 * достаточно бинарным поиском найти точку вставки и сверить только двух
 * соседей — O(log n) вместо линейного перебора всех назначений станка.
 *
 * Используется и в drag-валидации (см. pages/schedule-matrix), и в live
 * feasibility-проверке мастера заказа (см. п. 4.4 ТЗ) — поэтому лежит в
 * shared/lib, а не внутри конкретной страницы.
 */

export interface OccupiedInterval {
  id: string
  machineId: string
  /** unix ms */
  start: number
  /** unix ms */
  end: number
}

export type OverlapSource = Pick<OccupiedInterval, 'id' | 'machineId'> & {
  startAt: string | Date
  endAt: string | Date
}

function toIntervals(source: OverlapSource[]): OccupiedInterval[] {
  return source.map((item) => ({
    id: item.id,
    machineId: item.machineId,
    start: new Date(item.startAt).getTime(),
    end: new Date(item.endAt).getTime(),
  }))
}

export class OccupancyIndex {
  private byMachine = new Map<string, OccupiedInterval[]>()

  constructor(source: OverlapSource[] = []) {
    this.rebuild(source)
  }

  rebuild(source: OverlapSource[]): void {
    this.byMachine.clear()
    for (const interval of toIntervals(source)) {
      this.insert(interval)
    }
  }

  insert(interval: OccupiedInterval): void {
    const list = this.byMachine.get(interval.machineId) ?? []
    const index = this.lowerBound(list, interval.start)
    list.splice(index, 0, interval)
    this.byMachine.set(interval.machineId, list)
  }

  remove(machineId: string, id: string): void {
    const list = this.byMachine.get(machineId)
    if (!list) return
    const index = list.findIndex((item) => item.id === id)
    if (index !== -1) list.splice(index, 1)
  }

  /** Индекс первого элемента с start >= target (бинарный поиск). */
  private lowerBound(list: OccupiedInterval[], target: number): number {
    let low = 0
    let high = list.length
    while (low < high) {
      const mid = (low + high) >>> 1
      const midStart = list[mid]?.start ?? Infinity
      if (midStart < target) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }

  /**
   * Есть ли на станке хоть одно назначение, пересекающее [start, end).
   * excludeId — исключить конкретное назначение (сам перетаскиваемый блок).
   */
  hasOverlap(machineId: string, start: number, end: number, excludeId?: string): boolean {
    return this.findOverlapping(machineId, start, end, excludeId).length > 0
  }

  /** Список назначений, пересекающих интервал — нужен для подсветки "что мешает". */
  findOverlapping(machineId: string, start: number, end: number, excludeId?: string): OccupiedInterval[] {
    const list = this.byMachine.get(machineId)
    if (!list || list.length === 0) return []

    const from = this.lowerBound(list, start)
    const result: OccupiedInterval[] = []

    // Кандидат слева от точки вставки (мог начаться раньше, но ещё не закончиться)
    const left = list[from - 1]
    if (left && left.end > start && left.id !== excludeId) result.push(left)

    // Дальше идём вправо, пока начало кандидата раньше конца искомого интервала
    for (let i = from; i < list.length; i++) {
      const candidate = list[i]
      if (!candidate || candidate.start >= end) break
      if (candidate.id !== excludeId) result.push(candidate)
    }

    return result
  }
}
