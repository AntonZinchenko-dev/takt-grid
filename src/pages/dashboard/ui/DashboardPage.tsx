import { Loader2 } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { GroupLoadHeatmap, OutputTrendChart, DowntimeTrendChart } from '@/widgets/trend-charts'
import { useDashboardSummaryQuery } from '../model/use-dashboard-summary'
import { KpiCards } from './KpiCards'
import { WorkloadDonut } from './WorkloadDonut'
import { AttentionOrdersTable } from './AttentionOrdersTable'
import { TodayMiniGantt } from './TodayMiniGantt'
import { QuickFilters } from './QuickFilters'

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummaryQuery()

  return (
    <>
      <TopHeader title="Дашборд" subtitle="Обзор текущей загрузки и ключевые показатели" />
      <main className="flex-1 overflow-y-auto p-6">
        {isLoading || !data ? (
          <div className="flex h-full items-center justify-center text-[var(--color-ink-400)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <KpiCards kpis={data.kpis} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
              <GroupLoadHeatmap data={data.groupLoadByDay} periodLabel="7 дней" />
              <WorkloadDonut data={data.groupDistribution} totalPercent={data.kpis.overallLoadPercent} />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr_280px]">
              <AttentionOrdersTable orders={data.attentionOrders} />
              <TodayMiniGantt machines={data.todayGantt} />
              <QuickFilters />
            </div>

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
