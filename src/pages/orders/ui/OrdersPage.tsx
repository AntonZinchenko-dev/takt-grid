import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TopHeader } from '@/widgets/top-header'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Pagination } from '@/shared/ui/Pagination'
import { useOrdersPageQuery, priorityBgVar, priorityColorVar, priorityLabel, statusLabel, type OrderPriority, type OrderStatus } from '@/entities/order'
import { cn } from '@/shared/lib/cn'

const STATUS_DOT: Record<OrderStatus, string> = {
  planned: 'var(--color-priority-normal)',
  in_progress: 'var(--color-priority-low)',
  at_risk: 'var(--color-priority-high)',
  overdue: 'var(--color-priority-critical)',
  done: 'var(--color-priority-done)',
  needs_reassignment: 'var(--color-status-reassign)',
}

const STATUS_OPTIONS: OrderStatus[] = ['planned', 'in_progress', 'at_risk', 'overdue', 'done', 'needs_reassignment']
const PRIORITY_OPTIONS: OrderPriority[] = ['low', 'normal', 'high', 'critical']
const PAGE_SIZE = 20

export function OrdersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [priority, setPriority] = useState<OrderPriority | 'all'>('all')
  const [page, setPage] = useState(1)

  const query = useOrdersPageQuery({
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    priority: priority === 'all' ? undefined : priority,
    page,
    pageSize: PAGE_SIZE,
  })

  const resetToFirstPage = () => setPage(1)

  return (
    <>
      <TopHeader title="Заказы" subtitle="Полный реестр заказов с фильтрами" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] p-4">
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-400)]" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  resetToFirstPage()
                }}
                placeholder="Поиск по коду или продукту…"
                className="h-9 w-full rounded-lg border border-[var(--color-border)] pl-8 pr-3 text-sm outline-none focus:border-[var(--color-brand-500)]"
              />
            </div>
            <select
              aria-label="Фильтр по статусу заказа"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as OrderStatus | 'all')
                resetToFirstPage()
              }}
              className="h-9 rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)]"
            >
              <option value="all">Статус: Все</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <select
              aria-label="Фильтр по приоритету"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as OrderPriority | 'all')
                resetToFirstPage()
              }}
              className="h-9 rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)]"
            >
              <option value="all">Приоритет: Все</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel(p)}
                </option>
              ))}
            </select>
            {query.data && <span className="ml-auto text-xs text-[var(--color-ink-400)]">Всего {query.data.total}</span>}
          </div>

          {query.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-600)]">
                    <th className="px-4 py-2.5">Заказ</th>
                    <th className="px-4 py-2.5">Продукт</th>
                    <th className="px-4 py-2.5 text-right">Количество</th>
                    <th className="px-4 py-2.5">Приоритет</th>
                    <th className="px-4 py-2.5">Статус</th>
                    <th className="px-4 py-2.5">Дедлайн</th>
                    <th className="px-4 py-2.5">
                      <span className="sr-only">Действие</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(query.data?.items ?? []).map((order) => (
                    <tr key={order.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-canvas)]">
                      <td className="px-4 py-2.5 font-medium text-[var(--color-ink-900)]">{order.code}</td>
                      <td className="px-4 py-2.5 text-[var(--color-ink-600)]">{order.productName}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">{order.quantity}</td>
                      <td className="px-4 py-2.5">
                        <Badge bg={priorityBgVar(order.priority)} color={priorityColorVar(order.priority)}>
                          {priorityLabel(order.priority)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-[var(--color-ink-600)]">
                          <span className={cn('h-2 w-2 rounded-full')} style={{ backgroundColor: STATUS_DOT[order.status] }} />
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-[var(--color-ink-600)]">{format(new Date(order.deadline), 'd MMM yyyy', { locale: ru })}</td>
                      <td className="px-4 py-2.5">
                        {order.status === 'needs_reassignment' && (
                          <Link to={`/matrix?assignOrder=${order.id}`}>
                            <Button size="sm" variant="primary">
                              Назначить
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {query.data?.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[var(--color-ink-400)]">
                        Ничего не найдено
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {query.data && <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} />}
        </Card>
      </main>
    </>
  )
}
