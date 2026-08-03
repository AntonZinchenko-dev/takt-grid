import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/shared/api'
import type { Machine } from '../model/types'

export function useMachinesQuery() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: () => fetchJson<Machine[]>('/api/machines'),
    staleTime: 5 * 60_000,
  })
}
