import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson } from '@/shared/api'
import type { HolidayOverride } from '../model/types'

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
