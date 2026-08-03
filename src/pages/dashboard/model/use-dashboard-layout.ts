import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_DASHBOARD_PANEL_ORDER, type DashboardPanelId } from './panels'

function swap(list: DashboardPanelId[], i: number, j: number): DashboardPanelId[] {
  const a = list[i]
  const b = list[j]
  if (a === undefined || b === undefined) return list
  const next = [...list]
  next[i] = b
  next[j] = a
  return next
}

interface DashboardLayoutState {
  order: DashboardPanelId[]
  hidden: DashboardPanelId[]
  toggleHidden: (id: DashboardPanelId) => void
  moveUp: (id: DashboardPanelId) => void
  moveDown: (id: DashboardPanelId) => void
  reorder: (draggedId: DashboardPanelId, targetId: DashboardPanelId) => void
  reset: () => void
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set) => ({
      order: DEFAULT_DASHBOARD_PANEL_ORDER,
      hidden: [],

      toggleHidden: (id) =>
        set((s) => ({
          hidden: s.hidden.includes(id) ? s.hidden.filter((p) => p !== id) : [...s.hidden, id],
        })),

      moveUp: (id) =>
        set((s) => {
          const idx = s.order.indexOf(id)
          if (idx <= 0) return s
          return { order: swap(s.order, idx - 1, idx) }
        }),

      moveDown: (id) =>
        set((s) => {
          const idx = s.order.indexOf(id)
          if (idx === -1 || idx >= s.order.length - 1) return s
          return { order: swap(s.order, idx, idx + 1) }
        }),

      reorder: (draggedId, targetId) =>
        set((s) => {
          if (draggedId === targetId) return s
          const order = [...s.order]
          const fromIdx = order.indexOf(draggedId)
          if (fromIdx === -1) return s
          order.splice(fromIdx, 1)
          const toIdx = order.indexOf(targetId)
          if (toIdx === -1) return s
          order.splice(toIdx, 0, draggedId)
          return { order }
        }),

      reset: () => set({ order: DEFAULT_DASHBOARD_PANEL_ORDER, hidden: [] }),
    }),
    { name: 'taktgrid.dashboard-layout' },
  ),
)
