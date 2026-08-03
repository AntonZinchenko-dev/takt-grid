import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/shared/api'
import type { DashboardSummary } from './types'

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchJson<DashboardSummary>('/api/dashboard/summary'),
    staleTime: 60_000,
  })
}
