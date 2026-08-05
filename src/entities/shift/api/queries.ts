import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { Shift, WorkCalendarSettings } from '../model/types'

export function useShiftsQuery() {
  return useQuery({
    queryKey: ['shifts'],
    queryFn: () => fetchJson<Shift[]>('/api/shifts'),
    staleTime: 60_000,
  })
}

export type CreateShiftParams = Omit<Shift, 'id'>
export type UpdateShiftParams = Partial<Omit<Shift, 'id'>> & { id: string }

export function useCreateShiftMutation() {
  const queryClient = useQueryClient()
  return useMutation<Shift, ApiError, CreateShiftParams>({
    mutationFn: (body) =>
      fetchJson<Shift>('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  })
}

export function useUpdateShiftMutation() {
  const queryClient = useQueryClient()
  return useMutation<Shift, ApiError, UpdateShiftParams>({
    mutationFn: ({ id, ...body }) =>
      fetchJson<Shift>(`/api/shifts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  })
}

export function useDeleteShiftMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ deleted: true }, ApiError, string>({
    mutationFn: (id) => fetchJson<{ deleted: true }>(`/api/shifts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  })
}

export function useWorkCalendarQuery() {
  return useQuery({
    queryKey: ['work-calendar'],
    queryFn: () => fetchJson<WorkCalendarSettings>('/api/work-calendar'),
    staleTime: 60_000,
  })
}

export function useUpdateWorkCalendarMutation() {
  const queryClient = useQueryClient()
  return useMutation<WorkCalendarSettings, ApiError, WorkCalendarSettings>({
    mutationFn: (body) =>
      fetchJson<WorkCalendarSettings>('/api/work-calendar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-calendar'] }),
  })
}
