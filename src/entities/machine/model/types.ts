export type MachineStatus = 'running' | 'idle' | 'down'

export interface Machine {
  id: string
  name: string
  workshopId: string
  /** Тип/группа станка — используется для сопоставления с TechMap.machineGroupId */
  groupId: string
  groupName: string
  status: MachineStatus
  capacityPerHour: number
  /** Порядок внутри цеха в матрице */
  order: number
}

export interface DowntimeRule {
  id: string
  machineId: string
  recurrence: 'once' | 'daily' | 'weekly'
  startAt: string
  endAt: string
  reason: string
}
