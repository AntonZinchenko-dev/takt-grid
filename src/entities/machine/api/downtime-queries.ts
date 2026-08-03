import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { DowntimeRule } from '../model/types'

export function useDowntimeRulesQuery() {
  return useQuery({
    queryKey: ['downtime-rules'],
    queryFn: () => fetchJson<DowntimeRule[]>('/api/downtime-rules'),
    staleTime: 60_000,
  })
}

export interface CreateDowntimeRuleParams {
  machineId: string
  startAt: string
  endAt: string
  reason: string
  recurrence: DowntimeRule['recurrence']
}

export function useCreateDowntimeRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation<DowntimeRule, ApiError, CreateDowntimeRuleParams>({
    mutationFn: (body) =>
      fetchJson<DowntimeRule>('/api/downtime-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downtime-rules'] })
    },
  })
}
