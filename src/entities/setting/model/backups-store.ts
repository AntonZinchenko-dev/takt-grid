import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BackupSnapshot {
  id: string
  label: string
  createdAt: string
  payload: unknown
}

interface BackupsState {
  backups: BackupSnapshot[]
  addBackup: (snapshot: BackupSnapshot) => void
  removeBackup: (id: string) => void
}

const MAX_BACKUPS = 10

export const useBackupsStore = create<BackupsState>()(
  persist(
    (set) => ({
      backups: [],
      addBackup: (snapshot) => set((s) => ({ backups: [snapshot, ...s.backups].slice(0, MAX_BACKUPS) })),
      removeBackup: (id) => set((s) => ({ backups: s.backups.filter((b) => b.id !== id) })),
    }),
    { name: 'taktgrid.backups' },
  ),
)
