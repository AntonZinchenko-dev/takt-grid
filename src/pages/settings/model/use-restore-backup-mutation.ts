import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchJson } from '@/shared/api'
import type { Machine } from '@/entities/machine'
import type { TeamMember } from '@/entities/user'

export interface RestorePayload {
  machines?: Machine[]
  teamMembers?: TeamMember[]
}

/**
 * Восстанавливает срез мок-датасета из резервной копии (вкладка "Система").
 * Живёт на уровне страницы, а не entities — композиция из нескольких сущностей (machine + user)
 * запрещена между слайсами одного слоя по FSD.
 */
export function useRestoreBackupMutation() {
  const queryClient = useQueryClient()
  return useMutation<{ restored: true }, Error, RestorePayload>({
    mutationFn: (body) =>
      fetchJson<{ restored: true }>('/api/system/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}
