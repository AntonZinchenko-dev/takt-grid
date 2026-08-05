import { useEffect, useRef, useState } from 'react'
import { useTeamMembersQuery } from '@/entities/user'
import { useToastStore } from '@/shared/lib/toast-store'
import type { GridStore } from './grid-store'

const CHANNEL_NAME = 'taktgrid-matrix-presence'
const PEER_TIMEOUT_MS = 12_000
const HEARTBEAT_INTERVAL_MS = 5_000

export type MatrixPresenceEventType = 'heartbeat' | 'dragging-start' | 'dragging-end' | 'assignment-moved' | 'assignment-created'

export interface MatrixPresenceEvent {
  type: MatrixPresenceEventType
  tabId: string
  actorName: string
  orderCode?: string
  machineName?: string
  assignmentId?: string
  machineId?: string
  at: number
}

export interface PresencePeer {
  tabId: string
  actorName: string
  lastSeen: number
  dragging: boolean
}

let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

let selfTabId: string | null = null
function getTabId(): string {
  if (!selfTabId) selfTabId = crypto.randomUUID()
  return selfTabId
}

/**
 * Имя "личности" текущей вкладки — выбирается случайно из уже существующих сотрудников
 * (см. entities/user, Настройки → Пользователи и роли), чтобы не путать с реальным admin-юзером.
 * Хранится на уровне модуля, а не React-состояния: broadcastMatrixEvent вызывается из мест,
 * не подписанных на usePresenceChannel (авто-расстановка, drag в гриде), и должен видеть
 * то же имя, что уже выбрал хук при монтировании страницы.
 */
let selfActorName: string | null = null

const FALLBACK_NAMES = ['Планировщик']

/** Публикует событие от текущей вкладки — вызывается напрямую из мутаций (drag, авто-расстановка), не только из хука. */
export function broadcastMatrixEvent(event: Omit<MatrixPresenceEvent, 'tabId' | 'actorName' | 'at'>): void {
  const ch = getChannel()
  if (!ch) return
  const payload: MatrixPresenceEvent = { ...event, tabId: getTabId(), actorName: selfActorName ?? FALLBACK_NAMES[0]!, at: Date.now() }
  ch.postMessage(payload)
}

export function usePresenceChannel(store: GridStore): { selfName: string; peers: PresencePeer[] } {
  const teamMembersQuery = useTeamMembersQuery()
  const pushToast = useToastStore((s) => s.push)
  const [selfName, setSelfName] = useState(selfActorName ?? FALLBACK_NAMES[0]!)
  const [peers, setPeers] = useState<Map<string, PresencePeer>>(new Map())
  const tabId = useRef(getTabId()).current

  // Выбираем "личность" один раз, когда список сотрудников подгрузился, и держим её стабильной на весь сеанс вкладки.
  useEffect(() => {
    if (selfActorName || !teamMembersQuery.data || teamMembersQuery.data.length === 0) return
    const candidates = teamMembersQuery.data.filter((m) => m.status === 'active')
    const pool = candidates.length > 0 ? candidates : teamMembersQuery.data
    const picked = pool[Math.floor(Math.random() * pool.length)]!.name
    selfActorName = picked
    setSelfName(picked)
  }, [teamMembersQuery.data])

  useEffect(() => {
    const ch = getChannel()
    if (!ch) return

    const handleMessage = (e: MessageEvent<MatrixPresenceEvent>) => {
      const event = e.data
      if (event.tabId === tabId) return

      setPeers((prev) => {
        const next = new Map(prev)
        const existing = next.get(event.tabId)
        next.set(event.tabId, {
          tabId: event.tabId,
          actorName: event.actorName,
          lastSeen: event.at,
          dragging: event.type === 'dragging-start' ? true : event.type === 'dragging-end' ? false : (existing?.dragging ?? false),
        })
        return next
      })

      if (event.type === 'assignment-moved' || event.type === 'assignment-created') {
        const verb = event.type === 'assignment-moved' ? 'перенёс(ла)' : 'назначил(а)'
        pushToast(`${event.actorName} ${verb} ${event.orderCode ?? 'заказ'}${event.machineName ? ` на ${event.machineName}` : ''}`, 'info')
        if (event.assignmentId) {
          store.setHighlightedAssignment(event.assignmentId, event.machineId)
          window.setTimeout(() => store.setHighlightedAssignment(null), 2500)
        }
      }
    }

    ch.addEventListener('message', handleMessage)
    return () => ch.removeEventListener('message', handleMessage)
  }, [tabId, store, pushToast])

  // Heartbeat — иначе вторая вкладка появляется в PresenceBar только после первого действия в ней.
  useEffect(() => {
    const ch = getChannel()
    if (!ch) return
    const tick = () => broadcastMatrixEvent({ type: 'heartbeat' })
    tick()
    const interval = window.setInterval(tick, HEARTBEAT_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [])

  // Чистим "протухшие" вкладки (закрытые без явного сигнала — BroadcastChannel не шлёт onclose).
  useEffect(() => {
    const interval = window.setInterval(() => {
      setPeers((prev) => {
        const now = Date.now()
        const next = new Map([...prev].filter(([, peer]) => now - peer.lastSeen < PEER_TIMEOUT_MS))
        return next.size === prev.size ? prev : next
      })
    }, HEARTBEAT_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [])

  return { selfName, peers: [...peers.values()] }
}
