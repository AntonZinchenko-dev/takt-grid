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

export function useOrdersQuery(filter: OrdersFilter = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['orders', filter],
    queryFn: () => fetchJson<Order[]>(`/api/orders${buildQuery(filter)}`),
    enabled: options.enabled ?? true,
  })
}

export interface OrdersPageFilter {
  status?: OrderStatus
  priority?: OrderPriority
  search?: string
  page: number
  pageSize: number
}

export interface OrdersPageResult {
  items: Order[]
  total: number
}

function buildPageQuery(filter: OrdersPageFilter): string {
  const params = new URLSearchParams()
  if (filter.status) params.set('status', filter.status)
  if (filter.priority) params.set('priority', filter.priority)
  if (filter.search) params.set('search', filter.search)
  params.set('page', String(filter.page))
  params.set('pageSize', String(filter.pageSize))
  return `?${params.toString()}`
}

/** Постраничный реестр заказов — отдельно от useOrdersQuery (та отдаёт плоский массив для внутренних выборок "весь датасет"). */
export function useOrdersPageQuery(filter: OrdersPageFilter) {
  return useQuery({
    // Тот же префикс 'orders', что и у useOrdersQuery — иначе существующие invalidateQueries(['orders'])
    // (создание/удаление заказа, каскад простоя, переназначение) не заденут постраничный реестр.
    queryKey: ['orders', 'page', filter],
    queryFn: () => fetchJson<OrdersPageResult>(`/api/orders${buildPageQuery(filter)}`),
    placeholderData: (prev) => prev,
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

export function useDeleteOrderMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ deleted: boolean }, ApiError, string>({
    mutationFn: (orderId) => fetchJson<{ deleted: boolean }>(`/api/orders/${orderId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}
