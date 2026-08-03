export interface GroupLoadDay {
  date: string
  label: string
  percent: number
}

export interface GroupLoadRow {
  groupId: string
  groupName: string
  days: GroupLoadDay[]
}

export interface OutputTrendPoint {
  date: string
  label: string
  plan: number
  fact: number
}

export interface DowntimeTrendPoint {
  date: string
  label: string
  breakdown: Record<string, number>
}
