export interface ScheduleAssignment {
  id: string
  orderId: string
  machineId: string
  /** ISO datetime, часовое разрешение */
  startAt: string
  endAt: string
  plannedQuantity: number
}
