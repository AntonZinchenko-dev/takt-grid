import { observer } from 'mobx-react-lite'
import type { GridStore } from '../model/grid-store'
import { TOTAL_HOURS, hourIndexToDate, dateToHourIndex } from '../lib/timeline'

const WIDTH = 220
const HEIGHT = 24

export const Minimap = observer(function Minimap({ store }: { store: GridStore }) {
  const viewportLeft = (store.visibleHourStart / TOTAL_HOURS) * WIDTH
  const viewportWidth = Math.max(4, ((store.visibleHourEnd - store.visibleHourStart) / TOTAL_HOURS) * WIDTH)
  const nowHour = dateToHourIndex(store.epochMs, new Date())
  const nowLeft = Math.min(WIDTH - 1, Math.max(0, (nowHour / TOTAL_HOURS) * WIDTH))

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    store.jumpToDate(hourIndexToDate(store.epochMs, fraction * TOTAL_HOURS))
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-[var(--color-ink-900)]">Мини-карта</p>
      <div onClick={handleClick} className="relative cursor-pointer rounded-md bg-[var(--color-canvas)]" style={{ width: WIDTH, height: HEIGHT }} title="Клик — перейти к этому моменту">
        <div className="absolute top-0 h-full w-px bg-red-400" style={{ left: nowLeft }} />
        <div
          className="absolute top-0 h-full rounded-sm border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-500)]/20"
          style={{ left: viewportLeft, width: viewportWidth }}
        />
      </div>
    </div>
  )
})
