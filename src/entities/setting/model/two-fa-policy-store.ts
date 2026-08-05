import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TwoFaPolicyState {
  /** id ролей (см. entities/user), для которых 2FA обязательна. */
  enforceForRoleIds: string[]
  toggleRole: (roleId: string) => void
}

export const useTwoFaPolicyStore = create<TwoFaPolicyState>()(
  persist(
    (set) => ({
      enforceForRoleIds: ['admin'],
      toggleRole: (roleId) =>
        set((s) => ({
          enforceForRoleIds: s.enforceForRoleIds.includes(roleId) ? s.enforceForRoleIds.filter((r) => r !== roleId) : [...s.enforceForRoleIds, roleId],
        })),
    }),
    { name: 'taktgrid.two-fa-policy' },
  ),
)
