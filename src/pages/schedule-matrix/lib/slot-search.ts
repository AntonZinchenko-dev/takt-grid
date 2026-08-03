export interface BusyInterval {
  start: number
  end: number
}

export interface SlotSearchResult {
  start: number
  end: number
}

/**
 * Первый свободный интервал длиной >= requiredMs между searchStart и searchEnd.
 * busyIntervals должен быть отсортирован по start (OccupancyIndex.findOverlapping
 * уже возвращает именно такой порядок — см. shared/lib/occupancy-index.ts).
 */
export function findFirstAvailableSlot(
  busyIntervals: BusyInterval[],
  searchStart: number,
  searchEnd: number,
  requiredMs: number,
): SlotSearchResult | null {
  let cursor = searchStart

  for (const interval of busyIntervals) {
    if (interval.start - cursor >= requiredMs) {
      return { start: cursor, end: cursor + requiredMs }
    }
    cursor = Math.max(cursor, interval.end)
  }

  if (searchEnd - cursor >= requiredMs) {
    return { start: cursor, end: cursor + requiredMs }
  }

  return null
}
