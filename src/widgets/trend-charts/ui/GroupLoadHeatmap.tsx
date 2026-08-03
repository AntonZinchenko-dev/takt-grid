import { Info } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { GroupLoadRow } from '../model/types'

function heatCellStyle(percent: number): { backgroundColor: string; color: string } {
  const clamped = Math.max(0, Math.min(100, percent))
  const alpha = 0.08 + (clamped / 100) * 0.85
  return {
    backgroundColor: `rgba(37, 99, 235, ${alpha.toFixed(2)})`,
    color: clamped > 55 ? '#ffffff' : 'var(--color-ink-900)',
  }
}

interface GroupLoadHeatmapProps {
  data: GroupLoadRow[]
  title?: string
  periodLabel?: string
}

export function GroupLoadHeatmap({ data, title = 'Загрузка оборудования по группам станков', periodLabel }: GroupLoadHeatmapProps) {
  const days = data[0]?.days ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle>{title}</CardTitle>
          <Info className="h-3.5 w-3.5 text-[var(--color-ink-400)]" />
        </div>
        {periodLabel && <span className="text-xs text-[var(--color-ink-400)]">{periodLabel}</span>}
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--color-ink-600)]">Группа станков</th>
                {days.map((d) => (
                  <th key={d.date} className="px-2 py-2 text-center text-xs font-medium text-[var(--color-ink-600)]">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.groupId}>
                  <td className="whitespace-nowrap px-2 py-1 text-sm font-medium text-[var(--color-ink-900)]">{row.groupName}</td>
                  {row.days.map((d) => (
                    <td key={d.date} className="p-1">
                      <div className="flex h-9 items-center justify-center rounded-md text-xs font-semibold tabular-nums" style={heatCellStyle(d.percent)}>
                        {d.percent}%
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  )
}
