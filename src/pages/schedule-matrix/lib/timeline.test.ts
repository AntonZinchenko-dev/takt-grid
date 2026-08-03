import { describe, expect, it } from 'vitest'
import {
  DAY_MS,
  HOUR_MS,
  RANGE_END_DAYS,
  RANGE_START_DAYS,
  TOTAL_DAYS,
  TOTAL_HOURS,
  computeEpoch,
  dateToHourIndex,
  formatDayHeading,
  formatDayShort,
  hourIndexToDate,
  startOfDay,
} from './timeline'

describe('startOfDay', () => {
  it('обнуляет время суток, не трогая дату', () => {
    const result = startOfDay(new Date(2026, 2, 15, 17, 42, 3, 500))
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
    expect(result.getDate()).toBe(15)
  })
})

describe('computeEpoch', () => {
  it('сдвигает начало координат на RANGE_START_DAYS от полуночи текущего дня', () => {
    const now = new Date(2026, 2, 15, 12, 0, 0)
    const epoch = computeEpoch(now)
    expect(epoch).toBe(startOfDay(now).getTime() + RANGE_START_DAYS * DAY_MS)
  })

  it('окно матрицы фиксировано: -14 дней назад, +90 дней вперёд', () => {
    expect(RANGE_START_DAYS).toBe(-14)
    expect(RANGE_END_DAYS).toBe(90)
    expect(TOTAL_DAYS).toBe(104)
    expect(TOTAL_HOURS).toBe(104 * 24)
  })
})

describe('hourIndexToDate / dateToHourIndex', () => {
  it('являются взаимно обратными операциями', () => {
    const epoch = computeEpoch(new Date(2026, 0, 1))
    const date = hourIndexToDate(epoch, 250)
    expect(dateToHourIndex(epoch, date)).toBe(250)
  })

  it('hourIndexToDate сдвигается ровно на HOUR_MS за индекс', () => {
    const epoch = 0
    expect(hourIndexToDate(epoch, 1).getTime()).toBe(HOUR_MS)
    expect(hourIndexToDate(epoch, 24).getTime()).toBe(DAY_MS)
  })

  it('dateToHourIndex округляет вниз внутри часа', () => {
    const epoch = 0
    const middleOfHour = new Date(HOUR_MS * 3 + 59 * 60_000)
    expect(dateToHourIndex(epoch, middleOfHour)).toBe(3)
  })

  it('dateToHourIndex принимает как Date, так и ISO-строку', () => {
    const epoch = 0
    const iso = new Date(HOUR_MS * 5).toISOString()
    expect(dateToHourIndex(epoch, iso)).toBe(5)
  })
})

describe('formatDayHeading / formatDayShort', () => {
  it('formatDayHeading формирует дату в родительном падеже с днём недели', () => {
    // 15 марта 2026 — воскресенье
    expect(formatDayHeading(new Date(2026, 2, 15))).toBe('15 марта 2026, воскресенье')
  })

  it('formatDayShort формирует dd.MM с ведущими нулями', () => {
    expect(formatDayShort(new Date(2026, 0, 5))).toBe('05.01')
    expect(formatDayShort(new Date(2026, 10, 23))).toBe('23.11')
  })
})
