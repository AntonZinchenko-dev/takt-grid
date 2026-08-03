import { describe, expect, it } from 'vitest'
import type { Machine, DowntimeRule } from '@/entities/machine'
import { OccupancyIndex } from '@/shared/lib/occupancy-index'
import { findSlotCandidates } from './slot-candidates'

const h = (hour: number) => hour * 3_600_000

function makeMachine(id: string, order: number): Machine {
  return {
    id,
    name: `Станок ${id}`,
    workshopId: 'w1',
    groupId: 'g1',
    groupName: 'Группа 1',
    status: 'running',
    capacityPerHour: 10,
    order,
  }
}

describe('findSlotCandidates', () => {
  it('находит свободный слот на пустом станке с самого начала окна поиска', () => {
    const machine = makeMachine('m1', 0)
    const occupancyIndex = new OccupancyIndex()

    const candidates = findSlotCandidates({
      groupMachines: [machine],
      occupancyIndex,
      searchStart: h(0),
      searchEnd: h(48),
      requiredMs: h(4),
      deadlineMs: null,
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({ start: h(0), end: h(4), fitsDeadline: true })
  })

  it('обходит занятые назначения и предлагает следующий свободный слот', () => {
    const machine = makeMachine('m1', 0)
    const occupancyIndex = new OccupancyIndex([
      { id: 'a', machineId: 'm1', startAt: new Date(h(0)), endAt: new Date(h(4)) },
    ])

    const candidates = findSlotCandidates({
      groupMachines: [machine],
      occupancyIndex,
      searchStart: h(0),
      searchEnd: h(48),
      requiredMs: h(4),
      deadlineMs: null,
    })

    expect(candidates[0]).toMatchObject({ start: h(4), end: h(8) })
  })

  it('учитывает простои станка как занятость наравне с назначениями', () => {
    const machine = makeMachine('m1', 0)
    const occupancyIndex = new OccupancyIndex()
    const downtimeByMachine = new Map<string, DowntimeRule[]>([
      [
        'm1',
        [{ id: 'd1', machineId: 'm1', recurrence: 'once', startAt: new Date(h(0)).toISOString(), endAt: new Date(h(6)).toISOString(), reason: 'ТО' }],
      ],
    ])

    const candidates = findSlotCandidates({
      groupMachines: [machine],
      occupancyIndex,
      downtimeByMachine,
      searchStart: h(0),
      searchEnd: h(48),
      requiredMs: h(4),
      deadlineMs: null,
    })

    expect(candidates[0]).toMatchObject({ start: h(6), end: h(10) })
  })

  it('excludeAssignmentId исключает переносимое назначение из собственной занятости', () => {
    const machine = makeMachine('m1', 0)
    const occupancyIndex = new OccupancyIndex([
      { id: 'dragged', machineId: 'm1', startAt: new Date(h(0)), endAt: new Date(h(4)) },
    ])

    const candidates = findSlotCandidates({
      groupMachines: [machine],
      occupancyIndex,
      searchStart: h(0),
      searchEnd: h(48),
      requiredMs: h(4),
      deadlineMs: null,
      excludeAssignmentId: 'dragged',
    })

    expect(candidates[0]).toMatchObject({ start: h(0), end: h(4) })
  })

  it('сортирует кандидатов: сначала укладывающиеся в дедлайн, затем по времени начала', () => {
    const early = makeMachine('early', 0)
    const late = makeMachine('late', 1)
    const occupancyIndex = new OccupancyIndex([
      // "early" занят допоздна — его первый слот не укладывается в дедлайн
      { id: 'busy', machineId: 'early', startAt: new Date(h(0)), endAt: new Date(h(20)) },
    ])

    const candidates = findSlotCandidates({
      groupMachines: [early, late],
      occupancyIndex,
      searchStart: h(0),
      searchEnd: h(48),
      requiredMs: h(4),
      deadlineMs: h(10),
    })

    expect(candidates[0]!.machine.id).toBe('late')
    expect(candidates[0]!.fitsDeadline).toBe(true)
    expect(candidates[1]!.machine.id).toBe('early')
    expect(candidates[1]!.fitsDeadline).toBe(false)
  })

  it('ограничивает число кандидатов параметром limit', () => {
    const machines = Array.from({ length: 8 }, (_, i) => makeMachine(`m${i}`, i))
    const occupancyIndex = new OccupancyIndex()

    const candidates = findSlotCandidates({
      groupMachines: machines,
      occupancyIndex,
      searchStart: h(0),
      searchEnd: h(48),
      requiredMs: h(4),
      deadlineMs: null,
      limit: 3,
    })

    expect(candidates).toHaveLength(3)
  })

  it('не предлагает слот, если для него не хватает места в окне поиска', () => {
    const machine = makeMachine('m1', 0)
    const occupancyIndex = new OccupancyIndex([
      { id: 'a', machineId: 'm1', startAt: new Date(h(0)), endAt: new Date(h(46)) },
    ])

    const candidates = findSlotCandidates({
      groupMachines: [machine],
      occupancyIndex,
      searchStart: h(0),
      searchEnd: h(48),
      requiredMs: h(4),
      deadlineMs: null,
    })

    expect(candidates).toHaveLength(0)
  })
})
