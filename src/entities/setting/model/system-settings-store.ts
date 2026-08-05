import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DateFormat = 'dd.MM.yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy'
export type Units = 'metric' | 'imperial'

interface SystemSettingsState {
  dateFormat: DateFormat
  units: Units
  setDateFormat: (v: DateFormat) => void
  setUnits: (v: Units) => void
}

export const useSystemSettingsStore = create<SystemSettingsState>()(
  persist(
    (set) => ({
      dateFormat: 'dd.MM.yyyy',
      units: 'metric',
      setDateFormat: (v) => set({ dateFormat: v }),
      setUnits: (v) => set({ units: v }),
    }),
    { name: 'taktgrid.system-settings' },
  ),
)
