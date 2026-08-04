export interface ScheduleAssignment {
  id: string
  orderId: string
  machineId: string
  /** ISO datetime, часовое разрешение */
  startAt: string
  endAt: string
  plannedQuantity: number
  /** Фактически выполненное количество (годное) — вводится вручную в карточке заказа. */
  actualQuantity?: number
  /** Брак, шт — вводится вместе с результатом. */
  defectQuantity?: number
  /** Номер смены, внёсшей результат. */
  shiftNumber?: number
}
