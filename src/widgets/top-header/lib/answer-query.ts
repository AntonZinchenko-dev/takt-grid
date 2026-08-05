import { statusLabel, type Order } from '@/entities/order'
import type { Machine } from '@/entities/machine'
import type { Product } from '@/entities/product'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'

export interface AssistantData {
  orders: Order[]
  machines: Machine[]
  products: Product[]
  assignments: ScheduleAssignment[]
}

export interface AssistantResultItem {
  id: string
  label: string
  sublabel?: string
  navigate: { path: string; state?: Record<string, unknown> }
}

export interface AssistantAnswer {
  text: string
  items: AssistantResultItem[]
}

const MAX_ITEMS = 6

function orderItem(order: Order): AssistantResultItem {
  return { id: order.id, label: order.code, sublabel: `${statusLabel(order.status)} · ${order.productName}`, navigate: { path: '/matrix', state: { jumpToIso: order.deadline, highlightOrderId: order.id } } }
}

function machineItem(machine: Machine, sublabel?: string): AssistantResultItem {
  return { id: machine.id, label: machine.name, sublabel, navigate: { path: '/machines', state: { openMachineId: machine.id } } }
}

const MACHINE_STATUS_LABEL: Record<Machine['status'], string> = { running: 'работает', idle: 'простаивает', down: 'авария' }

function answerOrderLookup(q: string, data: AssistantData): AssistantAnswer | null {
  const match = data.orders.find((o) => q.includes(o.code.toLowerCase()))
  if (!match) return null
  const assignment = data.assignments.find((a) => a.orderId === match.id)
  const machine = assignment ? data.machines.find((m) => m.id === assignment.machineId) : undefined
  const location = machine ? ` Сейчас на станке «${machine.name}».` : match.status === 'needs_reassignment' ? ' Не назначен ни на один станок.' : ''
  return { text: `${match.code} — ${statusLabel(match.status)}, продукт «${match.productName}».${location}`, items: [orderItem(match)] }
}

function answerMachineLookup(q: string, data: AssistantData): AssistantAnswer | null {
  const match = data.machines.find((m) => q.includes(m.name.toLowerCase()))
  if (!match) return null
  const assignment = data.assignments.find((a) => a.machineId === match.id)
  const order = assignment ? data.orders.find((o) => o.id === assignment.orderId) : undefined
  const current = order ? ` Сейчас выполняет ${order.code} (${order.productName}).` : ' Сейчас без назначенного заказа.'
  return { text: `«${match.name}» (${match.groupName}) — ${MACHINE_STATUS_LABEL[match.status]}.${current}`, items: [machineItem(match)] }
}

function answerAtRisk(q: string, data: AssistantData): AssistantAnswer | null {
  if (!/риск|срыв|просроч/.test(q)) return null
  const orders = data.orders.filter((o) => o.status === 'at_risk' || o.status === 'overdue').sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  if (orders.length === 0) return { text: 'Заказов под риском срыва или просроченных сейчас нет.', items: [] }
  return { text: `Под риском срыва или просрочено: ${orders.length}.`, items: orders.slice(0, MAX_ITEMS).map(orderItem) }
}

function answerNeedsReassignment(q: string, data: AssistantData): AssistantAnswer | null {
  if (!/переназнач|без станка|не назначен/.test(q)) return null
  const orders = data.orders.filter((o) => o.status === 'needs_reassignment')
  if (orders.length === 0) return { text: 'Все заказы назначены на станки — очередь на переназначение пуста.', items: [] }
  return { text: `Нуждается в переназначении: ${orders.length}. Их можно расставить одной кнопкой «Авто-расставить» в матрице планирования.`, items: orders.slice(0, MAX_ITEMS).map(orderItem) }
}

function answerIdleMachines(q: string, data: AssistantData): AssistantAnswer | null {
  if (!/простаива|не работ|авари|сломан/.test(q)) return null
  const machines = data.machines.filter((m) => m.status === 'idle' || m.status === 'down')
  if (machines.length === 0) return { text: 'Все станки сейчас в работе.', items: [] }
  return {
    text: `Простаивает или в аварии: ${machines.length}.`,
    items: machines.slice(0, MAX_ITEMS).map((m) => machineItem(m, MACHINE_STATUS_LABEL[m.status])),
  }
}

function answerStats(q: string, data: AssistantData): AssistantAnswer | null {
  if (!/сколько|статистик|итого/.test(q)) return null
  const byStatus = new Map<string, number>()
  for (const o of data.orders) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1)
  const parts = [...byStatus.entries()].map(([status, count]) => `${statusLabel(status as Order['status'])} — ${count}`)
  return { text: `Всего заказов: ${data.orders.length}. По статусам: ${parts.join(', ')}.`, items: [] }
}

const HELP_TEXT =
  'Спросите, например: «какие заказы под риском», «какие станки простаивают», «что нуждается в переназначении», «сколько всего заказов», или назовите код заказа (WO-2026-…) либо название станка.'

const MATCHERS = [answerOrderLookup, answerMachineLookup, answerAtRisk, answerNeedsReassignment, answerIdleMachines, answerStats]

/**
 * Локальный офлайн-движок вопросов-ответов по текущим данным — без обращения к внешним LLM-сервисам.
 * Сознательный выбор: у приложения нет бэкенда, а значит негде безопасно хранить ключ реального AI API —
 * зашивать его в клиентский бандл небезопасно для публично задеплоенного демо. Вместо этого — набор
 * распознаваемых намерений поверх уже загруженных данных, с ответами, которые ведут на конкретные записи
 * (тот же navigate(path, {state}) — контракт, что у глобального поиска и командной палитры).
 */
export function answerQuery(question: string, data: AssistantData): AssistantAnswer {
  const q = question.trim().toLowerCase()
  if (q.length === 0) return { text: HELP_TEXT, items: [] }

  for (const matcher of MATCHERS) {
    const answer = matcher(q, data)
    if (answer) return answer
  }

  return { text: `Не нашёл ответа на этот вопрос. ${HELP_TEXT}`, items: [] }
}
