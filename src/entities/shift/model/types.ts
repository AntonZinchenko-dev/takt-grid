export interface Shift {
  id: string
  name: string
  color: string
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
}

/** Рабочие дни недели — индекс 0..6 соответствует Пн..Вс (см. WEEKDAYS в WorkCalendarTab). */
export interface WorkCalendarSettings {
  workingDays: number[]
}
