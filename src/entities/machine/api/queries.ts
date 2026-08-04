import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { Machine } from '../model/types'

export function useMachinesQuery() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: () => fetchJson<Machine[]>('/api/machines'),
    staleTime: 5 * 60_000,
  })
}

export interface CreateMachineParams {
  name: string
  workshopId: string
  groupId: string
  groupName: string
  capacityPerHour: number
}

export function useCreateMachineMutation() {
  const queryClient = useQueryClient()
  return useMutation<Machine, ApiError, CreateMachineParams>({
    mutationFn: (body) =>
      fetchJson<Machine>('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
    },
  })
}

export interface UpdateMachineParams {
  id: string
  name?: string
  workshopId?: string
  groupId?: string
  groupName?: string
  capacityPerHour?: number
  status?: Machine['status']
}

export interface UpdateMachineResult {
  machine: Machine
  /** Сколько назначений на этом станке стали несовместимы со сменой группы и были сняты. */
  unassignedCount: number
}

export function useUpdateMachineMutation() {
  const queryClient = useQueryClient()
  return useMutation<UpdateMachineResult, ApiError, UpdateMachineParams>({
    mutationFn: ({ id, ...body }) =>
      fetchJson<UpdateMachineResult>(`/api/machines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export interface DeleteMachineResult {
  deleted: true
  unassignedCount: number
}

export function useDeleteMachineMutation() {
  const queryClient = useQueryClient()
  return useMutation<DeleteMachineResult, ApiError, string>({
    mutationFn: (id) => fetchJson<DeleteMachineResult>(`/api/machines/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['downtime-rules'] })
    },
  })
}
