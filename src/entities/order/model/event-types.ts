export type OrderEventType = 'created' | 'reassigned' | 'moved' | 'unassigned' | 'result'

/**
 * Запись в истории заказа — кто (смена/действие) что сделал и когда. Пишется на бэкенде
 * (моке) в момент каждой мутации, читается только для отчёта по заказу (OrderReportDrawer).
 */
export interface OrderEvent {
  id: string
  orderId: string
  type: OrderEventType
  /** ISO datetime события. */
  at: string
  /** Станок, к которому относится событие (для moved — куда перенесли). */
  machineName?: string
  /** Только для moved — откуда перенесли. */
  fromMachineName?: string
  /** Только для unassigned — почему сняли с графика. */
  reason?: string
  /** Только для result — накопленные факт/брак на момент сохранения и номер смены. */
  actualQuantity?: number
  defectQuantity?: number
  shiftNumber?: number
}
