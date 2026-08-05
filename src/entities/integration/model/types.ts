export interface ApiKey {
  id: string
  label: string
  tokenMasked: string
  createdAt: string
}

export interface Webhook {
  id: string
  url: string
  event: string
  enabled: boolean
  createdAt: string
}

export type IntegrationStatus = 'connected' | 'disconnected'

export interface ExternalIntegration {
  id: string
  name: string
  description: string
  status: IntegrationStatus
  connectedAt: string | null
}
