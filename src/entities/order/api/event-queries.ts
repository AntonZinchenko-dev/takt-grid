import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/shared/api'
import type { OrderEvent } from '../model/event-types'

/** История заказа для отчёта — отсортирована сервером от новых к старым. */
export function useOrderEventsQuery(orderId: string, enabled = true) {
  return useQuery({
    queryKey: ['order-events', orderId],
    queryFn: () => fetchJson<OrderEvent[]>(`/api/orders/${orderId}/events`),
    enabled,
  })
}
