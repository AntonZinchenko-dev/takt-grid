import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SchedulingAlgorithm = 'fifo' | 'priority' | 'deadline'

export interface PriorityWeights {
  low: number
  normal: number
  high: number
  critical: number
}

interface PlanningSettingsState {
  orderHorizonDays: number
  bufferMinutes: number
  allowOverbooking: boolean
  schedulingAlgorithm: SchedulingAlgorithm
  priorityWeights: PriorityWeights
  setOrderHorizonDays: (v: number) => void
  setBufferMinutes: (v: number) => void
  setAllowOverbooking: (v: boolean) => void
  setSchedulingAlgorithm: (v: SchedulingAlgorithm) => void
  setPriorityWeight: (key: keyof PriorityWeights, v: number) => void
  reset: () => void
}

const DEFAULTS = {
  orderHorizonDays: 30,
  bufferMinutes: 15,
  allowOverbooking: false,
  schedulingAlgorithm: 'priority' as SchedulingAlgorithm,
  priorityWeights: { low: 1, normal: 2, high: 3, critical: 5 },
}

export const usePlanningSettingsStore = create<PlanningSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setOrderHorizonDays: (v) => set({ orderHorizonDays: v }),
      setBufferMinutes: (v) => set({ bufferMinutes: v }),
      setAllowOverbooking: (v) => set({ allowOverbooking: v }),
      setSchedulingAlgorithm: (v) => set({ schedulingAlgorithm: v }),
      setPriorityWeight: (key, v) => set((s) => ({ priorityWeights: { ...s.priorityWeights, [key]: v } })),
      reset: () => set(DEFAULTS),
    }),
    { name: 'taktgrid.planning-settings' },
  ),
)
