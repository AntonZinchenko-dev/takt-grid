import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { priorityBgVar, priorityColorVar, priorityLabel } from '@/entities/order'
import type { DashboardSummary } from '../model/types'

export function AttentionOrdersTable({ orders }: { orders: DashboardSummary['attentionOrders'] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Заказы, требующие внимания</CardTitle>
          <Badge bg="var(--color-priority-high-bg)" color="var(--color-priority-high)">
            {orders.length}
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-[var(--color-ink-600)]">
                <th className="pb-2 pr-3">Приоритет</th>
                <th className="pb-2 pr-3">Заказ</th>
                <th className="pb-2 pr-3">Продукт</th>
                <th className="pb-2 pr-3">Дедлайн</th>
                <th className="pb-2 pr-3">Группа станков</th>
                <th className="pb-2 pr-3">Причина</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId} className="border-t border-[var(--color-border)]">
                  <td className="py-2 pr-3">
                    <Badge bg={priorityBgVar(order.priority)} color={priorityColorVar(order.priority)}>
                      {priorityLabel(order.priority)}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 font-medium text-[var(--color-ink-900)]">{order.code}</td>
                  <td className="py-2 pr-3 text-[var(--color-ink-600)]">{order.productName}</td>
                  <td className="py-2 pr-3 tabular-nums text-[var(--color-ink-600)]">{format(new Date(order.deadline), 'dd.MM.yyyy', { locale: ru })}</td>
                  <td className="py-2 pr-3 text-[var(--color-ink-600)]">{order.groupName}</td>
                  <td className="py-2 pr-3 text-[var(--color-ink-600)]">{order.reason}</td>
                  <td className="py-2">
                    <Link to="/matrix" state={{ jumpToIso: order.deadline }}>
                      <Button size="sm" variant="secondary">
                        Открыть
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-[var(--color-ink-400)]">
                    Нет заказов, требующих внимания
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Link to="/orders" className="mt-3 inline-block text-sm font-medium text-[var(--color-brand-600)] hover:underline">
          Смотреть все заказы →
        </Link>
      </CardBody>
    </Card>
  )
}
