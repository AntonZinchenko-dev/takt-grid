import type { MockDataset } from './generate-mock-data'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

export function hashString(value: string): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function dayBounds(date: Date): { start: number; end: number } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return { start: start.getTime(), end: start.getTime() + DAY }
}

export function overlapHours(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart)
  return overlap > 0 ? overlap / HOUR : 0
}

export function busyHoursInRange(dataset: MockDataset, machineIds: Set<string>, rangeStart: number, rangeEnd: number): number {
  let total = 0
  for (const a of dataset.assignments) {
    if (!machineIds.has(a.machineId)) continue
    total += overlapHours(new Date(a.startAt).getTime(), new Date(a.endAt).getTime(), rangeStart, rangeEnd)
  }
  return total
}
