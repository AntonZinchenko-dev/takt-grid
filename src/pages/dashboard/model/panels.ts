export type DashboardPanelId =
  | 'groupLoadHeatmap'
  | 'workloadDonut'
  | 'attentionOrders'
  | 'todayGantt'
  | 'quickFilters'
  | 'outputTrend'
  | 'downtimeTrend'

export interface DashboardPanelMeta {
  id: DashboardPanelId
  label: string
  /** Ширина панели в колонках сетки xl:grid-cols-6. */
  xlSpan: 2 | 3 | 4
}

export const DASHBOARD_PANELS: DashboardPanelMeta[] = [
  { id: 'groupLoadHeatmap', label: 'Загрузка оборудования по группам', xlSpan: 4 },
  { id: 'workloadDonut', label: 'Распределение загрузки по группам', xlSpan: 2 },
  { id: 'attentionOrders', label: 'Заказы, требующие внимания', xlSpan: 2 },
  { id: 'todayGantt', label: 'Загрузка станков сегодня', xlSpan: 2 },
  { id: 'quickFilters', label: 'Быстрые фильтры', xlSpan: 2 },
  { id: 'outputTrend', label: 'Выпуск продукции', xlSpan: 3 },
  { id: 'downtimeTrend', label: 'Простои оборудования', xlSpan: 3 },
]

export const DEFAULT_DASHBOARD_PANEL_ORDER: DashboardPanelId[] = DASHBOARD_PANELS.map((p) => p.id)

export const XL_COL_SPAN_CLASS: Record<DashboardPanelMeta['xlSpan'], string> = {
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
}
