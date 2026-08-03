import { describe, expect, it } from 'vitest'
import { OccupancyIndex } from './occupancy-index'

const h = (hour: number) => new Date(2025, 0, 1, hour).getTime()

describe('OccupancyIndex', () => {
  it('находит пересечение с одним существующим интервалом', () => {
    const index = new OccupancyIndex([
      { id: 'a', machineId: 'm1', startAt: new Date(h(8)), endAt: new Date(h(12)) },
    ])

    expect(index.hasOverlap('m1', h(10), h(14))).toBe(true)
    expect(index.hasOverlap('m1', h(0), h(8))).toBe(false) // впритык, но не пересекается ([start,end))
    expect(index.hasOverlap('m1', h(12), h(16))).toBe(false) // впритык с другой стороны
  })

  it('не путает станки между собой', () => {
    const index = new OccupancyIndex([
      { id: 'a', machineId: 'm1', startAt: new Date(h(8)), endAt: new Date(h(12)) },
    ])
    expect(index.hasOverlap('m2', h(8), h(12))).toBe(false)
  })

  it('корректно работает при большом количестве интервалов (бинарный поиск, а не полный перебор)', () => {
    const source = Array.from({ length: 2000 }, (_, i) => ({
      id: `order-${i}`,
      machineId: 'm1',
      startAt: new Date(h(0) + i * 3_600_000 * 3),
      endAt: new Date(h(0) + i * 3_600_000 * 3 + 3_600_000 * 2),
    }))
    const index = new OccupancyIndex(source)

    // Проверяем занятость в середине диапазона — интервал #1000
    const target = source[1000]!
    expect(index.hasOverlap('m1', new Date(target.startAt).getTime() + 1000, new Date(target.endAt).getTime())).toBe(true)
  })

  it('excludeId позволяет игнорировать сам перетаскиваемый блок', () => {
    const index = new OccupancyIndex([
      { id: 'dragged', machineId: 'm1', startAt: new Date(h(8)), endAt: new Date(h(12)) },
    ])
    expect(index.hasOverlap('m1', h(8), h(12), 'dragged')).toBe(false)
    expect(index.hasOverlap('m1', h(8), h(12), 'someone-else')).toBe(true)
  })

  it('findOverlapping возвращает все мешающие назначения, а не только первое', () => {
    const index = new OccupancyIndex([
      { id: 'a', machineId: 'm1', startAt: new Date(h(8)), endAt: new Date(h(10)) },
      { id: 'b', machineId: 'm1', startAt: new Date(h(10)), endAt: new Date(h(12)) },
      { id: 'c', machineId: 'm1', startAt: new Date(h(14)), endAt: new Date(h(16)) },
    ])
    const overlapping = index.findOverlapping('m1', h(9), h(13))
    expect(overlapping.map((i) => i.id).sort()).toEqual(['a', 'b'])
  })

  it('insert/remove поддерживают сортировку по start', () => {
    const index = new OccupancyIndex()
    index.insert({ id: 'c', machineId: 'm1', start: h(14), end: h(16) })
    index.insert({ id: 'a', machineId: 'm1', start: h(8), end: h(10) })
    index.insert({ id: 'b', machineId: 'm1', start: h(10), end: h(12) })

    expect(index.hasOverlap('m1', h(9), h(11))).toBe(true)
    index.remove('m1', 'b')
    expect(index.hasOverlap('m1', h(10), h(12))).toBe(false)
  })
})
