import { hourIndexToDate } from '../../lib/timeline'

const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const HOUR_STEPS = [1, 2, 3, 4, 6, 12, 24]
const MIN_LABEL_SPACING_PX = 46

interface TimeHeaderBandProps {
  epochMs: number
  hourWidth: number
  visibleStartHour: number
  visibleEndHour: number
}

export function TimeHeaderBand({ epochMs, hourWidth, visibleStartHour, visibleEndHour }: TimeHeaderBandProps) {
  const dayStart = Math.floor(visibleStartHour / 24) * 24
  const dayEnd = Math.ceil(visibleEndHour / 24) * 24

  const days: { hour: number; label: string }[] = []
  for (let h = dayStart; h < dayEnd; h += 24) {
    const date = hourIndexToDate(epochMs, h)
    days.push({ hour: h, label: `${WEEKDAY_SHORT[date.getDay()]} ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}` })
  }

  const hourStep = HOUR_STEPS.find((s) => s * hourWidth >= MIN_LABEL_SPACING_PX) ?? 24
  const showHourTicks = hourWidth >= 8

  const ticks: { hour: number; label: string }[] = []
  if (showHourTicks) {
    const start = Math.floor(visibleStartHour / hourStep) * hourStep
    for (let h = start; h < visibleEndHour; h += hourStep) {
      const hourOfDay = ((h % 24) + 24) % 24
      if (hourOfDay === 0) continue // совпадёт с границей дня, не дублируем
      ticks.push({ hour: h, label: `${String(hourOfDay).padStart(2, '0')}:00` })
    }
  }

  return (
    <div className="relative h-full border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="relative h-7 border-b border-[var(--color-border)]">
        {days.map((d) => (
          <div
            key={d.hour}
            className="absolute top-0 flex h-7 items-center border-l border-[var(--color-border)] px-2 text-xs font-semibold capitalize text-[var(--color-ink-900)]"
            style={{ left: d.hour * hourWidth, width: 24 * hourWidth }}
          >
            <span className="truncate">{d.label}</span>
          </div>
        ))}
      </div>
      {showHourTicks && (
        <div className="relative h-[21px]">
          {ticks.map((t) => (
            <div
              key={t.hour}
              className="absolute top-0 flex h-full items-center border-l border-[var(--color-border)] pl-1.5 text-[10px] tabular-nums text-[var(--color-ink-400)]"
              style={{ left: t.hour * hourWidth }}
            >
              {t.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const TIME_HEADER_HEIGHT_WITH_HOURS = 28 + 21
export const TIME_HEADER_HEIGHT_DAY_ONLY = 28
