import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJson, ApiError } from '@/shared/api'
import type { Role, Group, TeamMember } from '../model/types'

export function useRolesQuery() {
  return useQuery({ queryKey: ['roles'], queryFn: () => fetchJson<Role[]>('/api/roles'), staleTime: 60_000 })
}

export type CreateRoleParams = Omit<Role, 'id'>
export type UpdateRoleParams = Partial<Omit<Role, 'id'>> & { id: string }

export function useCreateRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation<Role, ApiError, CreateRoleParams>({
    mutationFn: (body) => fetchJson<Role>('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation<Role, ApiError, UpdateRoleParams>({
    mutationFn: ({ id, ...body }) => fetchJson<Role>(`/api/roles/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ deleted: true }, ApiError, string>({
    mutationFn: (id) => fetchJson<{ deleted: true }>(`/api/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useGroupsQuery() {
  return useQuery({ queryKey: ['groups'], queryFn: () => fetchJson<Group[]>('/api/groups'), staleTime: 60_000 })
}

export type CreateGroupParams = Omit<Group, 'id'>
export type UpdateGroupParams = Partial<Omit<Group, 'id'>> & { id: string }

export function useCreateGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation<Group, ApiError, CreateGroupParams>({
    mutationFn: (body) => fetchJson<Group>('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useUpdateGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation<Group, ApiError, UpdateGroupParams>({
    mutationFn: ({ id, ...body }) => fetchJson<Group>(`/api/groups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useDeleteGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ deleted: true }, ApiError, string>({
    mutationFn: (id) => fetchJson<{ deleted: true }>(`/api/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  })
}

export function useTeamMembersQuery() {
  return useQuery({ queryKey: ['team-members'], queryFn: () => fetchJson<TeamMember[]>('/api/team-members'), staleTime: 60_000 })
}

export type CreateTeamMemberParams = Omit<TeamMember, 'id'>
export type UpdateTeamMemberParams = Partial<Omit<TeamMember, 'id'>> & { id: string }

export function useCreateTeamMemberMutation() {
  const queryClient = useQueryClient()
  return useMutation<TeamMember, ApiError, CreateTeamMemberParams>({
    mutationFn: (body) => fetchJson<TeamMember>('/api/team-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useUpdateTeamMemberMutation() {
  const queryClient = useQueryClient()
  return useMutation<TeamMember, ApiError, UpdateTeamMemberParams>({
    mutationFn: ({ id, ...body }) =>
      fetchJson<TeamMember>(`/api/team-members/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useDeleteTeamMemberMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ deleted: true }, ApiError, string>({
    mutationFn: (id) => fetchJson<{ deleted: true }>(`/api/team-members/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-members'] }),
  })
}
