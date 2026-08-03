import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import type { OutputTrendPoint } from '../model/types'

export function OutputTrendChart({ data, title = 'Выпуск продукции (шт.)' }: { data: OutputTrendPoint[]; title?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-4 text-xs text-[var(--color-ink-600)]">
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-3 border-t-2 border-dashed border-[var(--color-ink-400)]" /> План
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded bg-[var(--color-brand-600)]" /> Факт
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="factFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-ink-400)' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13 }} />
              <Area type="monotone" dataKey="fact" stroke="var(--color-brand-600)" strokeWidth={2} fill="url(#factFill)" dot={{ r: 3 }} name="Факт" />
              <Line type="monotone" dataKey="plan" stroke="var(--color-ink-400)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="План" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}
