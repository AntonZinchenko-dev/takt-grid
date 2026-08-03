export type OrderPriority = 'low' | 'normal' | 'high' | 'critical'
export type OrderStatus = 'planned' | 'in_progress' | 'at_risk' | 'overdue' | 'done'

export interface Order {
  id: string
  code: string
  productId: string
  productName: string
  quantity: number
  deadline: string
  priority: OrderPriority
  status: OrderStatus
}
