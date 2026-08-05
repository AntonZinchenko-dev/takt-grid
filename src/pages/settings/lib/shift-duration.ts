import type { Shift } from '@/entities/shift'

/** Длительность смены с учётом перехода через полночь (конец раньше начала). */
export function shiftDurationLabel(shift: Pick<Shift, 'startTime' | 'endTime'>): string {
  const [sh, sm] = shift.startTime.split(':').map(Number) as [number, number]
  const [eh, em] = shift.endTime.split(':').map(Number) as [number, number]
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes <= 0) minutes += 24 * 60
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h} ч ${String(m).padStart(2, '0')} мин`
}
