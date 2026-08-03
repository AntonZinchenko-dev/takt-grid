import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { Order, OrderPriority, OrderStatus } from '../model/types'

export interface OrdersFilter {
  status?: OrderStatus
  priority?: OrderPriority
  search?: string
  limit?: number
}

function buildQuery(filter: OrdersFilter): string {
  const params = new URLSearchParams()
  if (filter.status) params.set('status', filter.status)
  if (filter.priority) params.set('priority', filter.priority)
  if (filter.search) params.set('search', filter.search)
  if (filter.limit) params.set('limit', String(filter.limit))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useOrdersQuery(filter: OrdersFilter = {}) {
  return useQuery({
    queryKey: ['orders', filter],
    queryFn: () => fetchJson<Order[]>(`/api/orders${buildQuery(filter)}`),
  })
}

export interface CreateOrderParams {
  productId: string
  quantity: number
  deadline: string
  priority: OrderPriority
  machineId: string
  startAt: string
  endAt: string
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation<Order, ApiError, CreateOrderParams>({
    mutationFn: (body) =>
      fetchJson<Order>('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}
