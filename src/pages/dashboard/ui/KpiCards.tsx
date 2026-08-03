import { Gauge, AlertTriangle, CalendarClock, TrendingUp as WeekIcon, ListChecks } from 'lucide-react'
import { StatCard } from '@/shared/ui/StatCard'
import type { DashboardSummary } from '../model/types'

export function KpiCards({ kpis }: { kpis: DashboardSummary['kpis'] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        icon={<Gauge className="h-5 w-5" />}
        iconBg="var(--color-brand-50)"
        iconColor="var(--color-brand-600)"
        label="Загрузка оборудования"
        value={`${kpis.overallLoadPercent}%`}
        trend={{
          direction: kpis.loadTrendPercent >= 0 ? 'up' : 'down',
          label: `${kpis.loadTrendPercent >= 0 ? '+' : ''}${kpis.loadTrendPercent}% к вчера`,
          positive: kpis.loadTrendPercent >= 0,
        }}
      />
      <StatCard
        icon={<AlertTriangle className="h-5 w-5" />}
        iconBg="var(--color-priority-high-bg)"
        iconColor="var(--color-priority-high)"
        label="Заказы под угрозой срыва"
        value={String(kpis.ordersAtRisk)}
      />
      <StatCard
        icon={<CalendarClock className="h-5 w-5" />}
        iconBg="var(--color-priority-low-bg)"
        iconColor="var(--color-priority-low)"
        label="Свободные слоты сегодня"
        value={String(kpis.freeSlotsToday)}
      />
      <StatCard
        icon={<WeekIcon className="h-5 w-5" />}
        iconBg="var(--color-brand-50)"
        iconColor="var(--color-brand-600)"
        label="Загрузка на неделю"
        value={`${kpis.weekLoadPercent}%`}
        trend={{
          direction: kpis.weekLoadTrendPercent >= 0 ? 'up' : 'down',
          label: `${kpis.weekLoadTrendPercent >= 0 ? '+' : ''}${kpis.weekLoadTrendPercent}% к прошлой неделе`,
          positive: kpis.weekLoadTrendPercent >= 0,
        }}
      />
      <StatCard
        icon={<ListChecks className="h-5 w-5" />}
        iconBg="var(--color-ink-400)"
        iconColor="white"
        label="Активных заказов"
        value={String(kpis.activeOrders)}
      />
    </div>
  )
}
