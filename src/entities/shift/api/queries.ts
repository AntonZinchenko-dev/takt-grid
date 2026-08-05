import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { Shift, WorkCalendarSettings, HolidayOverride } from '../model/types'

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

export function useHolidayOverridesQuery() {
  return useQuery({
    queryKey: ['holiday-overrides'],
    queryFn: () => fetchJson<HolidayOverride[]>('/api/holidays'),
    staleTime: 60_000,
  })
}

export function useToggleHolidayMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ date: string; overridden: boolean }, Error, string, { previous?: HolidayOverride[] }>({
    mutationFn: (date) =>
      fetchJson<{ date: string; overridden: boolean }>('/api/holidays/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      }),
    onMutate: async (date) => {
      await queryClient.cancelQueries({ queryKey: ['holiday-overrides'] })
      const previous = queryClient.getQueryData<HolidayOverride[]>(['holiday-overrides'])
      queryClient.setQueryData<HolidayOverride[]>(['holiday-overrides'], (old = []) =>
        old.includes(date) ? old.filter((d) => d !== date) : [...old, date],
      )
      return { previous }
    },
    onError: (_err, _date, context) => {
      if (context?.previous) queryClient.setQueryData(['holiday-overrides'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['holiday-overrides'] })
    },
  })
}
