import { describe, expect, it } from 'vitest'
import { findFirstAvailableSlot } from './slot-search'

const H = 3_600_000

describe('findFirstAvailableSlot', () => {
  it('находит слот в самом начале, если станок свободен', () => {
    const result = findFirstAvailableSlot([], 0, 100 * H, 5 * H)
    expect(result).toEqual({ start: 0, end: 5 * H })
  })

  it('пропускает занятый интервал и находит следующий разрыв', () => {
    const busy = [{ start: 0, end: 3 * H }]
    const result = findFirstAvailableSlot(busy, 0, 100 * H, 5 * H)
    expect(result).toEqual({ start: 3 * H, end: 8 * H })
  })

  it('находит разрыв между двумя занятыми интервалами', () => {
    const busy = [
      { start: 0, end: 2 * H },
      { start: 4 * H, end: 6 * H },
    ]
    // разрыв [2H, 4H) — длина 2H, нужно 5H -> не влезает, ищем дальше после 6H
    const result = findFirstAvailableSlot(busy, 0, 100 * H, 5 * H)
    expect(result).toEqual({ start: 6 * H, end: 11 * H })
  })

  it('возвращает null, если ничего не влезает до searchEnd', () => {
    const busy = [{ start: 0, end: 10 * H }]
    const result = findFirstAvailableSlot(busy, 0, 12 * H, 5 * H)
    expect(result).toBeNull()
  })

  it('учитывает узкий разрыв ровно нужной длины (включительно)', () => {
    const busy = [
      { start: 0, end: 2 * H },
      { start: 7 * H, end: 9 * H },
    ]
    const result = findFirstAvailableSlot(busy, 0, 100 * H, 5 * H)
    expect(result).toEqual({ start: 2 * H, end: 7 * H })
  })
})
