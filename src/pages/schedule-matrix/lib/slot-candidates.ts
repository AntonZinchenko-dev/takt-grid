import type { Machine, DowntimeRule } from '@/entities/machine'
import type { OccupancyIndex } from '@/shared/lib/occupancy-index'
import { findFirstAvailableSlot, type BusyInterval } from './slot-search'

export interface SlotCandidate {
  machine: Machine
  start: number
  end: number
  fitsDeadline: boolean
}

interface FindSlotCandidatesParams {
  groupMachines: Machine[]
  occupancyIndex: OccupancyIndex
  /** Простои учитываются как занятость — иначе слот-поиск может предложить время, которое тут же станет новым конфликтом. */
  downtimeByMachine?: Map<string, DowntimeRule[]>
  searchStart: number
  searchEnd: number
  requiredMs: number
  deadlineMs: number | null
  /** Исключить текущее назначение из занятости (при переносе уже существующего блока). */
  excludeAssignmentId?: string
  limit?: number
}

/** Топ-N кандидатов на размещение по всем станкам группы, отсортированные "укладывается в срок" → "раньше". */
export function findSlotCandidates({
  groupMachines,
  occupancyIndex,
  downtimeByMachine,
  searchStart,
  searchEnd,
  requiredMs,
  deadlineMs,
  excludeAssignmentId,
  limit = 5,
}: FindSlotCandidatesParams): SlotCandidate[] {
  const results: SlotCandidate[] = []

  for (const machine of groupMachines) {
    const busyAssignments: BusyInterval[] = occupancyIndex
      .findOverlapping(machine.id, searchStart, searchEnd, excludeAssignmentId)
      .map((interval) => ({ start: interval.start, end: interval.end }))

    const busyDowntime: BusyInterval[] = (downtimeByMachine?.get(machine.id) ?? [])
      .map((rule) => ({ start: new Date(rule.startAt).getTime(), end: new Date(rule.endAt).getTime() }))
      .filter((interval) => interval.end > searchStart && interval.start < searchEnd)

    const busy = [...busyAssignments, ...busyDowntime].sort((a, b) => a.start - b.start)
    const slot = findFirstAvailableSlot(busy, searchStart, searchEnd, requiredMs)
    if (slot) {
      results.push({ machine, start: slot.start, end: slot.end, fitsDeadline: deadlineMs ? slot.end <= deadlineMs : true })
    }
  }

  results.sort((a, b) => (a.fitsDeadline !== b.fitsDeadline ? (a.fitsDeadline ? -1 : 1) : a.start - b.start))
  return results.slice(0, limit)
}
