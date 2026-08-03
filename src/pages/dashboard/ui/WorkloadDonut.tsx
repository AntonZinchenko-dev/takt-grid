import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { DashboardSummary } from '../model/types'

const PALETTE = ['#2563eb', '#60a5fa', '#16a34a', '#f97316', '#a855f7', '#22d3ee', '#94a3b8']

export function WorkloadDonut({ data, totalPercent }: { data: DashboardSummary['groupDistribution']; totalPercent: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Распределение загрузки по группам</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="relative mx-auto h-56 w-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="percent" nameKey="groupName" innerRadius={62} outerRadius={92} paddingAngle={2} strokeWidth={0}>
                {data.map((entry, i) => (
                  <Cell key={entry.groupId} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-[var(--color-ink-900)]">{totalPercent}%</span>
            <span className="text-xs text-[var(--color-ink-600)]">общая загрузка</span>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {data.map((entry, i) => (
            <li key={entry.groupId} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[var(--color-ink-600)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                {entry.groupName}
              </span>
              <span className="font-medium tabular-nums text-[var(--color-ink-900)]">{entry.percent}%</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
