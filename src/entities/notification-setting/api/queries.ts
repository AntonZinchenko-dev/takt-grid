import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { NotificationChannel, NotificationRule, NotificationTemplate } from '../model/types'

export function useNotificationChannelsQuery() {
  return useQuery({ queryKey: ['notification-channels'], queryFn: () => fetchJson<NotificationChannel[]>('/api/notification-channels'), staleTime: 60_000 })
}

export type UpdateNotificationChannelParams = Partial<Omit<NotificationChannel, 'id'>> & { id: string }

export function useUpdateNotificationChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation<NotificationChannel, ApiError, UpdateNotificationChannelParams>({
    mutationFn: ({ id, ...body }) =>
      fetchJson<NotificationChannel>(`/api/notification-channels/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-channels'] }),
  })
}

export function useNotificationRulesQuery() {
  return useQuery({ queryKey: ['notification-rules'], queryFn: () => fetchJson<NotificationRule[]>('/api/notification-rules'), staleTime: 60_000 })
}

const DEFAULT_RISK_THRESHOLD_HOURS = 6

/** Порог "риска срыва" — то же поле, что редактируется в правиле "order_at_risk" на вкладке Уведомления. */
export function useRiskThresholdHours(): number {
  const rulesQuery = useNotificationRulesQuery()
  return rulesQuery.data?.find((r) => r.event === 'order_at_risk')?.thresholdHours ?? DEFAULT_RISK_THRESHOLD_HOURS
}

export type UpdateNotificationRuleParams = Partial<Omit<NotificationRule, 'id'>> & { id: string }

export function useUpdateNotificationRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation<NotificationRule, ApiError, UpdateNotificationRuleParams>({
    mutationFn: ({ id, ...body }) =>
      fetchJson<NotificationRule>(`/api/notification-rules/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-rules'] }),
  })
}

export function useNotificationTemplatesQuery() {
  return useQuery({ queryKey: ['notification-templates'], queryFn: () => fetchJson<NotificationTemplate[]>('/api/notification-templates'), staleTime: 60_000 })
}

export type UpdateNotificationTemplateParams = Partial<Omit<NotificationTemplate, 'id'>> & { id: string }

export function useUpdateNotificationTemplateMutation() {
  const queryClient = useQueryClient()
  return useMutation<NotificationTemplate, ApiError, UpdateNotificationTemplateParams>({
    mutationFn: ({ id, ...body }) =>
      fetchJson<NotificationTemplate>(`/api/notification-templates/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-templates'] }),
  })
}
