import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/shared/api'
import type { AnalyticsSummary } from './types'

export function useAnalyticsSummaryQuery(days: number) {
  return useQuery({
    queryKey: ['analytics-summary', days],
    queryFn: () => fetchJson<AnalyticsSummary>(`/api/analytics/summary?days=${days}`),
    staleTime: 60_000,
  })
}
