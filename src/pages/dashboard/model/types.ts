import type { OrderPriority } from '@/entities/order'
import type { GroupLoadRow, OutputTrendPoint, DowntimeTrendPoint } from '@/widgets/trend-charts'

export interface DashboardSummary {
  kpis: {
    overallLoadPercent: number
    loadTrendPercent: number
    ordersAtRisk: number
    freeSlotsToday: number
    weekLoadPercent: number
    weekLoadTrendPercent: number
    activeOrders: number
  }
  groupLoadByDay: GroupLoadRow[]
  groupDistribution: Array<{ groupId: string; groupName: string; percent: number }>
  attentionOrders: Array<{
    orderId: string
    code: string
    productName: string
    deadline: string
    priority: OrderPriority
    groupName: string
    reason: string
  }>
  todayGantt: Array<{
    machineId: string
    machineName: string
    blocks: Array<{ startAt: string; endAt: string; kind: 'order' | 'idle' | 'downtime'; orderCode?: string; priority?: OrderPriority }>
  }>
  outputTrend: OutputTrendPoint[]
  downtimeTrend: DowntimeTrendPoint[]
}
