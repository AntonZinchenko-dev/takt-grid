import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Clock, Check, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useOrdersQuery, statusLabel, type Order } from '@/entities/order'
import { orderDeepLink } from '@/shared/lib/deep-links'

const MAX_VISIBLE = 8

export function NotificationsMenu() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const overdueQuery = useOrdersQuery({ status: 'overdue', limit: 20 })
  const atRiskQuery = useOrdersQuery({ status: 'at_risk', limit: 20 })

  const items = useMemo(() => {
    const combined = [...(overdueQuery.data ?? []), ...(atRiskQuery.data ?? [])]
    return combined.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [overdueQuery.data, atRiskQuery.data])

  const unreadCount = items.filter((o) => !readIds.has(o.id)).length

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markRead = (id: string) => setReadIds((prev) => new Set(prev).add(id))
  const markAllRead = () => setReadIds(new Set(items.map((o) => o.id)))

  const openOrder = (order: Order) => {
    markRead(order.id)
    setOpen(false)
    navigate(orderDeepLink(order.id, order.deadline))
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]"
        aria-label="Уведомления"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3.5 py-2.5">
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">Уведомления</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-medium text-[var(--color-brand-600)] hover:underline">
                <CheckCheck className="h-3.5 w-3.5" />
                Прочитать все
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-3.5 py-6 text-center text-sm text-[var(--color-ink-400)]">Нет активных уведомлений</p>}

            {items.slice(0, MAX_VISIBLE).map((order) => {
              const isRead = readIds.has(order.id)
              const isOverdue = order.status === 'overdue'
              return (
                <div
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openOrder(order)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openOrder(order)
                  }}
                  className="flex w-full cursor-pointer items-start gap-2.5 border-b border-[var(--color-border)] px-3.5 py-2.5 text-left last:border-b-0 hover:bg-[var(--color-canvas)]"
                >
                  <span className="mt-0.5 shrink-0">
                    {isOverdue ? (
                      <AlertTriangle className="h-4 w-4 text-[var(--color-priority-critical)]" />
                    ) : (
                      <Clock className="h-4 w-4 text-[var(--color-priority-high)]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={`truncate text-sm ${isRead ? 'font-normal text-[var(--color-ink-600)]' : 'font-semibold text-[var(--color-ink-900)]'}`}>
                        {order.code}
                      </span>
                      {!isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-600)]" />}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-ink-600)]">
                      {statusLabel(order.status)} · {order.productName}
                    </span>
                    <span className="block text-[11px] text-[var(--color-ink-400)]">Дедлайн {format(new Date(order.deadline), 'd MMM, HH:mm', { locale: ru })}</span>
                  </span>
                  {!isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        markRead(order.id)
                      }}
                      className="shrink-0 rounded p-1 text-[var(--color-ink-400)] hover:bg-[var(--color-border)] hover:text-[var(--color-ink-600)]"
                      aria-label="Отметить прочитанным"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={() => {
              setOpen(false)
              navigate('/conflicts')
            }}
            className="block w-full border-t border-[var(--color-border)] px-3.5 py-2.5 text-center text-xs font-medium text-[var(--color-brand-600)] hover:bg-[var(--color-canvas)]"
          >
            Все конфликты и риски →
          </button>
        </div>
      )}
    </div>
  )
}
