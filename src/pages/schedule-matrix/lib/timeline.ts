import { RANGE_START_DAYS, RANGE_END_DAYS } from '@/shared/lib/schedule-window'

export const HOUR_MS = 3_600_000
export const DAY_MS = 24 * HOUR_MS

export { RANGE_START_DAYS, RANGE_END_DAYS }
export const TOTAL_DAYS = RANGE_END_DAYS - RANGE_START_DAYS
export const TOTAL_HOURS = TOTAL_DAYS * 24

export type ZoomLevel = 'hour' | 'day' | 'week'

/** Ширина одного часового столбца в пикселях — единственное, что меняется с зумом. */
export const ZOOM_HOUR_WIDTH: Record<ZoomLevel, number> = {
  hour: 48,
  day: 14,
  week: 4,
}

export const ZOOM_LABEL: Record<ZoomLevel, string> = {
  hour: 'Час',
  day: 'День',
  week: 'Неделя',
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Начало координат временной оси — фиксируется один раз при создании GridStore. */
export function computeEpoch(now: Date): number {
  return startOfDay(now).getTime() + RANGE_START_DAYS * DAY_MS
}

export function hourIndexToDate(epochMs: number, hourIndex: number): Date {
  return new Date(epochMs + hourIndex * HOUR_MS)
}

export function dateToHourIndex(epochMs: number, date: Date | string): number {
  return Math.floor((new Date(date).getTime() - epochMs) / HOUR_MS)
}

const WEEKDAY_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const MONTH_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export function formatDayHeading(date: Date): string {
  return `${date.getDate()} ${MONTH_GENITIVE[date.getMonth()]} ${date.getFullYear()}, ${WEEKDAY_FULL[date.getDay()]}`
}

export function formatDayShort(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
}
