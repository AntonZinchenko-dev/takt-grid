import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DbConnectionFields {
  host: string
  port: number
  database: string
  user: string
}

interface DbConnectionState extends DbConnectionFields {
  setField: (patch: Partial<DbConnectionFields>) => void
}

export const useDbConnectionStore = create<DbConnectionState>()(
  persist(
    (set) => ({
      host: 'db.internal.taktgrid.ru',
      port: 5432,
      database: 'taktgrid_prod',
      user: 'taktgrid_app',
      setField: (patch) => set(patch),
    }),
    { name: 'taktgrid.db-connection' },
  ),
)
