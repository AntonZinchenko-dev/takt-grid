import { useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import type { GridStore } from '../model/grid-store'
import { TOTAL_HOURS, hourIndexToDate, dateToHourIndex, formatDayShort } from '../lib/timeline'

const WIDTH = 420
const HEIGHT = 44

const MONTH_LABELS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export const Minimap = observer(function Minimap({ store }: { store: GridStore }) {
  const viewportLeft = (store.visibleHourStart / TOTAL_HOURS) * WIDTH
  const viewportWidth = Math.max(8, ((store.visibleHourEnd - store.visibleHourStart) / TOTAL_HOURS) * WIDTH)
  const nowHour = dateToHourIndex(store.epochMs, new Date())
  const nowLeft = Math.min(WIDTH - 2, Math.max(0, (nowHour / TOTAL_HOURS) * WIDTH))

  // Метки месяцев — ориентиры вдоль всего диапазона, чтобы мини-карта читалась как карта, а не полоска.
  const monthTicks = useMemo(() => {
    const ticks: Array<{ left: number; label: string }> = []
    const rangeStart = hourIndexToDate(store.epochMs, 0)
    const rangeEnd = hourIndexToDate(store.epochMs, TOTAL_HOURS)
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
    if (cursor < rangeStart) cursor.setMonth(cursor.getMonth() + 1)
    while (cursor < rangeEnd) {
      const hourIndex = dateToHourIndex(store.epochMs, cursor)
      ticks.push({ left: (hourIndex / TOTAL_HOURS) * WIDTH, label: MONTH_LABELS[cursor.getMonth()]! })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return ticks
  }, [store.epochMs])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    store.jumpToDate(hourIndexToDate(store.epochMs, fraction * TOTAL_HOURS))
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--color-ink-900)]">Мини-карта</p>
        <p className="text-[11px] font-medium tabular-nums text-[var(--color-ink-600)]">
          {formatDayShort(hourIndexToDate(store.epochMs, store.visibleHourStart))} – {formatDayShort(hourIndexToDate(store.epochMs, store.visibleHourEnd))}
        </p>
      </div>
      <div
        onClick={handleClick}
        className="relative cursor-pointer overflow-hidden rounded-lg border-2 border-[var(--color-ink-400)]/30 bg-[var(--color-ink-900)]/[0.06] shadow-sm"
        style={{ width: WIDTH, height: HEIGHT }}
        title="Клик — перейти к этому моменту"
      >
        {monthTicks.map((tick) => (
          <div key={tick.left} className="pointer-events-none absolute inset-y-0 border-l border-[var(--color-ink-400)]/40" style={{ left: tick.left }}>
            <span className="absolute left-1 top-1 text-[10px] font-semibold uppercase leading-none text-[var(--color-ink-600)]">{tick.label}</span>
          </div>
        ))}
        <div
          className="pointer-events-none absolute top-0 h-full rounded-sm border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-500)]/40"
          style={{ left: viewportLeft, width: viewportWidth }}
        />
        <div className="pointer-events-none absolute top-0 h-full w-[3px] bg-red-500" style={{ left: nowLeft }}>
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-red-500" />
        </div>
      </div>
    </div>
  )
})
