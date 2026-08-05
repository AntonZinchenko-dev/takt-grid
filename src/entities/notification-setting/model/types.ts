export type NotificationChannelType = 'email' | 'push' | 'sms' | 'telegram'

export interface NotificationChannel {
  id: string
  type: NotificationChannelType
  name: string
  enabled: boolean
  target: string
}

export interface NotificationRule {
  id: string
  event: string
  label: string
  channelIds: string[]
  enabled: boolean
  thresholdHours?: number
}

export interface NotificationTemplate {
  id: string
  event: string
  name: string
  subject: string
  body: string
}
