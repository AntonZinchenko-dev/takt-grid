import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { Product } from '../model/types'

export function useProductsQuery() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetchJson<Product[]>('/api/products'),
    staleTime: 5 * 60_000,
  })
}

export interface UpdateTechMapParams {
  productId: string
  outputPerHour: number
  packageMultiplicity: number
}

export function useUpdateTechMapMutation() {
  const queryClient = useQueryClient()
  return useMutation<Product, ApiError, UpdateTechMapParams>({
    mutationFn: ({ productId, ...body }) =>
      fetchJson<Product>(`/api/products/${productId}/tech-map`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
