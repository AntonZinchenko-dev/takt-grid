import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { DowntimeTrendPoint } from '../model/types'

const REASONS = ['Поломка', 'Техобслуживание', 'Переналадка', 'Простой'] as const
const REASON_COLOR: Record<(typeof REASONS)[number], string> = {
  Поломка: '#ef4444',
  Техобслуживание: '#f97316',
  Переналадка: '#a855f7',
  Простой: '#94a3b8',
}

export function DowntimeTrendChart({ data, title = 'Простои оборудования (часы)' }: { data: DowntimeTrendPoint[]; title?: string }) {
  const rows = data.map((d) => ({
    label: d.label,
    ...Object.fromEntries(REASONS.map((r) => [r, d.breakdown[r] ?? 0])),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
              {REASONS.map((reason, i) => (
                <Bar key={reason} dataKey={reason} stackId="downtime" fill={REASON_COLOR[reason]} radius={i === REASONS.length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
