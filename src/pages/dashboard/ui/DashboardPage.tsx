import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { useDashboardSummaryQuery } from '../model/use-dashboard-summary'
import { useDashboardLayoutStore } from '../model/use-dashboard-layout'
import { DASHBOARD_PANELS, XL_COL_SPAN_CLASS, type DashboardPanelId } from '../model/panels'
import type { DashboardSummary } from '../model/types'
import { KpiCards } from './KpiCards'
import { AttentionOrdersTable } from './AttentionOrdersTable'
import { TodayMiniGantt } from './TodayMiniGantt'
import { QuickFilters } from './QuickFilters'
import { PanelSettingsMenu } from './PanelSettingsMenu'

// recharts тянет ~150 КБ — на дашборде (единственном eager-роуте) это раздувало главный
// бандл сверх предупреждения Vite (500 КБ). Графики уходят в свой чанк и подгружаются
// параллельно с данными, а не блокируют первый рендер остального дашборда.
const GroupLoadHeatmap = lazy(() => import('@/widgets/trend-charts').then((m) => ({ default: m.GroupLoadHeatmap })))
const OutputTrendChart = lazy(() => import('@/widgets/trend-charts').then((m) => ({ default: m.OutputTrendChart })))
const DowntimeTrendChart = lazy(() => import('@/widgets/trend-charts').then((m) => ({ default: m.DowntimeTrendChart })))
const WorkloadDonut = lazy(() => import('./WorkloadDonut').then((m) => ({ default: m.WorkloadDonut })))

function ChartSkeleton() {
  return <div className="h-64 animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
}

const PANEL_META = new Map(DASHBOARD_PANELS.map((p) => [p.id, p]))

function renderPanel(id: DashboardPanelId, data: DashboardSummary) {
  switch (id) {
    case 'groupLoadHeatmap':
      return (
        <Suspense fallback={<ChartSkeleton />}>
          <GroupLoadHeatmap data={data.groupLoadByDay} periodLabel="7 дней" />
        </Suspense>
      )
    case 'workloadDonut':
      return (
        <Suspense fallback={<ChartSkeleton />}>
          <WorkloadDonut data={data.groupDistribution} totalPercent={data.kpis.overallLoadPercent} />
        </Suspense>
      )
    case 'attentionOrders':
      return <AttentionOrdersTable orders={data.attentionOrders} />
    case 'todayGantt':
      return <TodayMiniGantt machines={data.todayGantt} />
    case 'quickFilters':
      return <QuickFilters />
    case 'outputTrend':
      return (
        <Suspense fallback={<ChartSkeleton />}>
          <OutputTrendChart data={data.outputTrend} />
        </Suspense>
      )
    case 'downtimeTrend':
      return (
        <Suspense fallback={<ChartSkeleton />}>
          <DowntimeTrendChart data={data.downtimeTrend} />
        </Suspense>
      )
  }
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummaryQuery()
  const order = useDashboardLayoutStore((s) => s.order)
  const hidden = useDashboardLayoutStore((s) => s.hidden)
  const visibleOrder = order.filter((id) => !hidden.includes(id))

  return (
    <>
      <TopHeader title="Дашборд" subtitle="Обзор текущей загрузки и ключевые показатели" actions={<PanelSettingsMenu />} />
      <main className="flex-1 overflow-y-auto p-6">
        {isLoading || !data ? (
          <div className="flex h-full items-center justify-center text-[var(--color-ink-400)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <KpiCards kpis={data.kpis} />

            {visibleOrder.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-6">
                {visibleOrder.map((id) => {
                  const meta = PANEL_META.get(id)
                  if (!meta) return null
                  return (
                    <div key={id} className={XL_COL_SPAN_CLASS[meta.xlSpan]}>
                      {renderPanel(id, data)}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-ink-400)]">
                Все панели скрыты. Откройте «Панели» в шапке страницы, чтобы включить нужные.
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
