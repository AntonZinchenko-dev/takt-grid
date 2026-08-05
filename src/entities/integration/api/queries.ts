import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { ApiKey, Webhook, ExternalIntegration } from '../model/types'

export function useApiKeysQuery() {
  return useQuery({ queryKey: ['api-keys'], queryFn: () => fetchJson<ApiKey[]>('/api/api-keys'), staleTime: 60_000 })
}

export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiKey, ApiError, { label: string }>({
    mutationFn: (body) => fetchJson<ApiKey>('/api/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ deleted: true }, ApiError, string>({
    mutationFn: (id) => fetchJson<{ deleted: true }>(`/api/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useWebhooksQuery() {
  return useQuery({ queryKey: ['webhooks'], queryFn: () => fetchJson<Webhook[]>('/api/webhooks'), staleTime: 60_000 })
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient()
  return useMutation<Webhook, ApiError, { url: string; event: string }>({
    mutationFn: (body) => fetchJson<Webhook>('/api/webhooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useUpdateWebhookMutation() {
  const queryClient = useQueryClient()
  return useMutation<Webhook, ApiError, Partial<Omit<Webhook, 'id'>> & { id: string }>({
    mutationFn: ({ id, ...body }) => fetchJson<Webhook>(`/api/webhooks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ deleted: true }, ApiError, string>({
    mutationFn: (id) => fetchJson<{ deleted: true }>(`/api/webhooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  })
}

export function useIntegrationsQuery() {
  return useQuery({ queryKey: ['integrations'], queryFn: () => fetchJson<ExternalIntegration[]>('/api/integrations'), staleTime: 60_000 })
}

export function useToggleIntegrationMutation() {
  const queryClient = useQueryClient()
  return useMutation<ExternalIntegration, ApiError, string>({
    mutationFn: (id) => fetchJson<ExternalIntegration>(`/api/integrations/${id}/toggle`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}
