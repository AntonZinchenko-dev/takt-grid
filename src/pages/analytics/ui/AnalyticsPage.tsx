import { useState } from 'react'
import { Loader2, Download, Gauge, Package, Clock3, AlertOctagon } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { StatCard } from '@/shared/ui/StatCard'
import { Button } from '@/shared/ui/Button'
import { GroupLoadHeatmap, OutputTrendChart, DowntimeTrendChart } from '@/widgets/trend-charts'
import { useAnalyticsSummaryQuery } from '../model/use-analytics-summary'
import { cn } from '@/shared/lib/cn'
import { downloadCsv } from '@/shared/lib/csv'

const PERIODS = [7, 30, 90] as const

export function AnalyticsPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30)
  const { data, isLoading } = useAnalyticsSummaryQuery(days)

  const handleExport = () => {
    if (!data) return
    downloadCsv(`taktgrid-output-${days}d.csv`, [
      ['Дата', 'План, шт.', 'Факт, шт.'],
      ...data.outputTrend.map((p) => [p.label, String(p.plan), String(p.fact)]),
    ])
  }

  return (
    <>
      <TopHeader
        title="Аналитика"
        subtitle="Загрузка, выпуск и простои за период"
        actions={
          <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setDays(p)}
                className={cn('px-3 py-1.5 text-xs font-medium transition-colors', days === p ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]')}
              >
                {p} дней
              </button>
            ))}
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        {isLoading || !data ? (
          <div className="flex h-full items-center justify-center text-[var(--color-ink-400)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard icon={<Gauge className="h-5 w-5" />} iconBg="var(--color-brand-50)" iconColor="var(--color-brand-600)" label="Средняя загрузка" value={`${data.totals.avgLoadPercent}%`} />
                <StatCard icon={<Package className="h-5 w-5" />} iconBg="var(--color-priority-low-bg)" iconColor="var(--color-priority-low)" label="Выпущено, шт." value={data.totals.totalOutput.toLocaleString('ru-RU')} />
                <StatCard icon={<Clock3 className="h-5 w-5" />} iconBg="var(--color-priority-high-bg)" iconColor="var(--color-priority-high)" label="Простои, ч" value={String(data.totals.totalDowntimeHours)} />
                <StatCard icon={<AlertOctagon className="h-5 w-5" />} iconBg="var(--color-priority-critical-bg)" iconColor="var(--color-priority-critical)" label="Просроченных заказов" value={String(data.totals.overdueCount)} />
              </div>
              <Button variant="secondary" className="ml-4" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                Экспорт CSV
              </Button>
            </div>

            <GroupLoadHeatmap data={data.groupLoadByDay} periodLabel={`${days} дней`} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <OutputTrendChart data={data.outputTrend} />
              <DowntimeTrendChart data={data.downtimeTrend} />
            </div>
          </div>
        )}
      </main>
    </>
  )
}
