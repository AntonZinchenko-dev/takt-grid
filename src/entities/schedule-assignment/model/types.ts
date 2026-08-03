export interface ScheduleAssignment {
  id: string
  orderId: string
  machineId: string
  /** ISO datetime, часовое разрешение */
  startAt: string
  endAt: string
  plannedQuantity: number
  /** Фактически выполненное количество — вводится вручную в карточке заказа. */
  actualQuantity?: number
}
