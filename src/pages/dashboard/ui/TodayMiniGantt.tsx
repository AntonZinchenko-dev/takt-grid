import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { priorityColorVar } from '@/entities/order'
import type { DashboardSummary } from '../model/types'

const HOUR_MARKS = [0, 4, 8, 12, 16, 20, 24]

function dayBounds(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return { start: start.getTime(), end: start.getTime() + 24 * 3_600_000 }
}

function toPercent(iso: string, dayStart: number, dayEnd: number): number {
  const t = new Date(iso).getTime()
  return ((Math.min(Math.max(t, dayStart), dayEnd) - dayStart) / (dayEnd - dayStart)) * 100
}

export function TodayMiniGantt({ machines }: { machines: DashboardSummary['todayGantt'] }) {
  const now = new Date()
  const { start, end } = dayBounds(now)
  const nowPercent = toPercent(now.toISOString(), start, end)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Загрузка станков сегодня</CardTitle>
      </CardHeader>
      <CardBody>
        <div>
          <div className="mb-1.5 flex justify-between pl-36 text-[11px] text-[var(--color-ink-400)]">
            {HOUR_MARKS.map((h) => (
              <span key={h}>{String(h).padStart(2, '0')}:00</span>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="w-36 shrink-0 space-y-2">
              {machines.map((m) => (
                <div key={m.machineId} className="flex h-6 items-center truncate text-sm text-[var(--color-ink-900)]">
                  {m.machineName}
                </div>
              ))}
            </div>

            <div className="relative flex-1 space-y-2">
              <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `${nowPercent}%` }}>
                <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Сейчас
                </span>
              </div>

              {machines.map((m) => (
                <div key={m.machineId} className="relative h-6 overflow-hidden rounded-md bg-[var(--color-canvas)]">
                  {m.blocks.map((block, i) => {
                    const left = toPercent(block.startAt, start, end)
                    const width = toPercent(block.endAt, start, end) - left
                    if (width <= 0 || block.kind === 'idle') return null
                    const isDowntime = block.kind === 'downtime'
                    return (
                      <div
                        key={i}
                        className="absolute top-0 h-full"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: isDowntime ? undefined : block.priority ? priorityColorVar(block.priority) : 'var(--color-priority-normal)',
                          backgroundImage: isDowntime
                            ? 'repeating-linear-gradient(135deg, var(--color-ink-400) 0, var(--color-ink-400) 3px, transparent 3px, transparent 7px)'
                            : undefined,
                        }}
                        title={isDowntime ? 'Техобслуживание' : block.orderCode}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Link to="/matrix" className="mt-4 inline-block text-sm font-medium text-[var(--color-brand-600)] hover:underline">
          Перейти к матрице планирования →
        </Link>
      </CardBody>
    </Card>
  )
}
