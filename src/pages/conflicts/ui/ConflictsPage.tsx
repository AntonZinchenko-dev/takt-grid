import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TopHeader } from '@/widgets/top-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Pagination } from '@/shared/ui/Pagination'
import { useMachinesQuery, useDowntimeRulesQuery } from '@/entities/machine'
import { useOrdersQuery, priorityBgVar, priorityColorVar, priorityLabel } from '@/entities/order'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'

const DAY_MS = 86_400_000
const PAGE_SIZE = 10

/**
 * Ссылка на шахматку с открытием карточки конфликта. Параметры одноразовые — SchedulePage
 * вычищает их из URL сразу после прочтения, поэтому используем query-строку, а не router state:
 * state намертво прилипает к записи истории, и возврат на неё (кнопка "назад") открывал бы
 * уже решённый конфликт заново.
 */
function matrixResolveLink(assignmentId: string, jumpIso: string, reason: string): string {
  const params = new URLSearchParams({ resolve: assignmentId, jump: jumpIso, reason })
  return `/matrix?${params.toString()}`
}

export function ConflictsPage() {
  const [downtimePage, setDowntimePage] = useState(1)
  const [riskyPage, setRiskyPage] = useState(1)
  const machinesQuery = useMachinesQuery()
  const downtimeQuery = useDowntimeRulesQuery()
  // Лимит с запасом над объёмом мок-датасета (~22k заказов, см. use-schedule-data.ts)
  const ordersQuery = useOrdersQuery({ limit: 30000 })

  const from = useMemo(() => new Date(Date.now() - 15 * DAY_MS).toISOString(), [])
  const to = useMemo(() => new Date(Date.now() + 40 * DAY_MS).toISOString(), [])
  const assignmentsQuery = useAssignmentsWindowQuery(from, to)

  const machinesById = useMemo(() => new Map((machinesQuery.data ?? []).map((m) => [m.id, m])), [machinesQuery.data])
  const ordersById = useMemo(() => new Map((ordersQuery.data ?? []).map((o) => [o.id, o])), [ordersQuery.data])

  const downtimeConflicts = useMemo(() => {
    const results: Array<{ id: string; assignmentId: string; machineName: string; orderCode: string; reason: string; startAt: string; endAt: string }> = []
    for (const rule of downtimeQuery.data ?? []) {
      const ruleStart = new Date(rule.startAt).getTime()
      const ruleEnd = new Date(rule.endAt).getTime()
      for (const assignment of assignmentsQuery.data ?? []) {
        if (assignment.machineId !== rule.machineId) continue
        const aStart = new Date(assignment.startAt).getTime()
        const aEnd = new Date(assignment.endAt).getTime()
        if (aStart < ruleEnd && aEnd > ruleStart) {
          const machine = machinesById.get(rule.machineId)
          const order = ordersById.get(assignment.orderId)
          results.push({
            id: `${rule.id}-${assignment.id}`,
            assignmentId: assignment.id,
            machineName: machine?.name ?? rule.machineId,
            orderCode: order?.code ?? assignment.orderId,
            reason: rule.reason,
            startAt: rule.startAt,
            endAt: rule.endAt,
          })
        }
      }
    }
    return results.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }, [downtimeQuery.data, assignmentsQuery.data, machinesById, ordersById])

  const assignmentByOrderId = useMemo(() => new Map((assignmentsQuery.data ?? []).map((a) => [a.orderId, a])), [assignmentsQuery.data])

  const riskyOrders = useMemo(
    () => (ordersQuery.data ?? []).filter((o) => o.status === 'at_risk' || o.status === 'overdue').sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
    [ordersQuery.data],
  )

  const isLoading = machinesQuery.isLoading || downtimeQuery.isLoading || ordersQuery.isLoading || assignmentsQuery.isLoading

  return (
    <>
      <TopHeader title="Конфликты" subtitle="Пересечения по станкам и заказы под угрозой дедлайна" />
      <main className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Пересечения по станкам</CardTitle>
                  <Badge bg="var(--color-priority-critical-bg)" color="var(--color-priority-critical)">
                    {downtimeConflicts.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <p className="mb-3 text-xs text-[var(--color-ink-600)]">
                  Заказы, запланированные на станок в интервал, который позже был помечен как простой/ТО — план и факт разошлись, требуется ручное решение.
                </p>
                <div className="space-y-1.5">
                  {downtimeConflicts.slice((downtimePage - 1) * PAGE_SIZE, downtimePage * PAGE_SIZE).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-priority-critical)]" />
                        <span>
                          <span className="font-medium text-[var(--color-ink-900)]">{c.orderCode}</span>
                          <span className="text-[var(--color-ink-600)]"> на «{c.machineName}» пересекается с «{c.reason}»</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-ink-600)]">
                        <span>{format(new Date(c.startAt), 'd MMM, HH:mm', { locale: ru })}</span>
                        <Link to={matrixResolveLink(c.assignmentId, c.startAt, c.reason)}>
                          <Button size="sm" variant="secondary">
                            Открыть
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {downtimeConflicts.length === 0 && <p className="py-4 text-center text-sm text-[var(--color-ink-400)]">Конфликтов не найдено</p>}
                </div>
              </CardBody>
              <Pagination page={downtimePage} pageSize={PAGE_SIZE} total={downtimeConflicts.length} onPageChange={setDowntimePage} />
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Заказы под угрозой срыва</CardTitle>
                  <Badge bg="var(--color-priority-high-bg)" color="var(--color-priority-high)">
                    {riskyOrders.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-1.5">
                  {riskyOrders.slice((riskyPage - 1) * PAGE_SIZE, riskyPage * PAGE_SIZE).map((order) => {
                    const assignment = assignmentByOrderId.get(order.id)
                    return (
                    <div key={order.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-ink-900)]">{order.code}</span>
                        <span className="text-[var(--color-ink-600)]">{order.productName}</span>
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge bg={priorityBgVar(order.priority)} color={priorityColorVar(order.priority)}>
                          {priorityLabel(order.priority)}
                        </Badge>
                        <span className="text-[var(--color-ink-600)]">{format(new Date(order.deadline), 'd MMM yyyy', { locale: ru })}</span>
                        {assignment ? (
                          <Link to={matrixResolveLink(assignment.id, assignment.startAt, 'риск срыва дедлайна')}>
                            <Button size="sm" variant="secondary">
                              Открыть
                            </Button>
                          </Link>
                        ) : (
                          <Link to="/matrix" state={{ jumpToIso: order.deadline }}>
                            <Button size="sm" variant="secondary">
                              Открыть
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                    )
                  })}
                  {riskyOrders.length === 0 && <p className="py-4 text-center text-sm text-[var(--color-ink-400)]">Угроз не найдено</p>}
                </div>
              </CardBody>
              <Pagination page={riskyPage} pageSize={PAGE_SIZE} total={riskyOrders.length} onPageChange={setRiskyPage} />
            </Card>
          </div>
        )}
      </main>
    </>
  )
}
