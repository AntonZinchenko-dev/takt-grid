import type { GroupLoadRow, OutputTrendPoint, DowntimeTrendPoint } from '@/widgets/trend-charts'

export interface AnalyticsSummary {
  days: number
  groupLoadByDay: GroupLoadRow[]
  outputTrend: OutputTrendPoint[]
  downtimeTrend: DowntimeTrendPoint[]
  totals: {
    totalOutput: number
    totalDowntimeHours: number
    overdueCount: number
    avgLoadPercent: number
  }
}
