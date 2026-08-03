import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { ScheduleAssignment } from '../model/types'

export function useAssignmentsWindowQuery(fromIso: string, toIso: string) {
  return useQuery({
    queryKey: ['assignments', fromIso, toIso],
    queryFn: () => fetchJson<ScheduleAssignment[]>(`/api/assignments?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`),
    placeholderData: (prev) => prev,
  })
}

export interface MoveAssignmentParams {
  id: string
  machineId: string
  startAt: string
  endAt: string
}

export function useMoveAssignmentMutation() {
  const queryClient = useQueryClient()
  return useMutation<ScheduleAssignment, ApiError, MoveAssignmentParams>({
    mutationFn: ({ id, ...body }) =>
      fetchJson<ScheduleAssignment>(`/api/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })
}

export interface BulkUpdateParams {
  updates: Array<{ id: string; plannedQuantity: number }>
}

export function useBulkUpdateAssignmentsMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ updated: number }, ApiError, BulkUpdateParams>({
    mutationFn: (body) =>
      fetchJson<{ updated: number }>('/api/assignments/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
  })
}
