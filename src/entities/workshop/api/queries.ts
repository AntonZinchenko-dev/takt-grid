import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/shared/api'
import type { Workshop } from '../model/types'

export function useWorkshopsQuery() {
  return useQuery({
    queryKey: ['workshops'],
    queryFn: () => fetchJson<Workshop[]>('/api/workshops'),
    staleTime: 5 * 60_000,
  })
}
