import type { OrderPriority, OrderStatus } from './types'

/**
 * Единая точка правды для подписей и цветов приоритета.
 * Используется и в легенде матрицы, и в бейджах таблиц, и в самих
 * блоках заказа в гриде — чтобы цвет "высокий приоритет" нигде не разъехался.
 */
const PRIORITY_LABEL: Record<OrderPriority, string> = {
  low: 'Низкий приоритет',
  normal: 'Средний приоритет',
  high: 'Высокий приоритет',
  critical: 'Критический',
}

const PRIORITY_COLOR_VAR: Record<OrderPriority, string> = {
  low: 'var(--color-priority-low)',
  normal: 'var(--color-priority-normal)',
  high: 'var(--color-priority-high)',
  critical: 'var(--color-priority-critical)',
}

const PRIORITY_BG_VAR: Record<OrderPriority, string> = {
  low: 'var(--color-priority-low-bg)',
  normal: 'var(--color-priority-normal-bg)',
  high: 'var(--color-priority-high-bg)',
  critical: 'var(--color-priority-critical-bg)',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  planned: 'Запланирован',
  in_progress: 'В работе',
  at_risk: 'Риск срыва',
  overdue: 'Просрочен',
  done: 'Выполнен',
  needs_reassignment: 'Нуждается в переназначении',
}

const STATUS_COLOR_VAR: Record<OrderStatus, string> = {
  planned: 'var(--color-priority-normal)',
  in_progress: 'var(--color-priority-low)',
  at_risk: 'var(--color-priority-high)',
  overdue: 'var(--color-priority-critical)',
  done: 'var(--color-priority-done)',
  needs_reassignment: 'var(--color-status-reassign)',
}

const STATUS_BG_VAR: Record<OrderStatus, string> = {
  planned: 'var(--color-priority-normal-bg)',
  in_progress: 'var(--color-priority-low-bg)',
  at_risk: 'var(--color-priority-high-bg)',
  overdue: 'var(--color-priority-critical-bg)',
  done: 'var(--color-priority-done-bg)',
  needs_reassignment: 'var(--color-status-reassign-bg)',
}

export function priorityLabel(priority: OrderPriority): string {
  return PRIORITY_LABEL[priority]
}

export function priorityColorVar(priority: OrderPriority): string {
  return PRIORITY_COLOR_VAR[priority]
}

export function priorityBgVar(priority: OrderPriority): string {
  return PRIORITY_BG_VAR[priority]
}

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status]
}

export function statusColorVar(status: OrderStatus): string {
  return STATUS_COLOR_VAR[status]
}

export function statusBgVar(status: OrderStatus): string {
  return STATUS_BG_VAR[status]
}
