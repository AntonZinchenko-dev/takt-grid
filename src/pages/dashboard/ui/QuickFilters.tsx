import { Link } from 'react-router-dom'
import { Calendar, CalendarRange, Flag, Wrench, Clock3 } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { matrixJumpLink } from '@/shared/lib/deep-links'

const FILTERS = [
  { id: 'today', label: 'Сегодня', icon: Calendar, to: matrixJumpLink(new Date().toISOString(), 'day'), state: undefined },
  { id: 'week', label: 'Эта неделя', icon: CalendarRange, to: matrixJumpLink(new Date().toISOString(), 'week'), state: undefined },
  { id: 'high-priority', label: 'Высокий приоритет', icon: Flag, to: '/orders', state: { initialPriority: 'high' } },
  { id: 'maintenance', label: 'Техобслуживание', icon: Wrench, to: '/conflicts', state: undefined },
  { id: 'overdue', label: 'Просроченные', icon: Clock3, to: '/orders', state: { initialStatus: 'overdue' } },
] as const

export function QuickFilters() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Быстрые фильтры</CardTitle>
      </CardHeader>
      <CardBody className="space-y-1">
        {FILTERS.map(({ id, label, icon: Icon, to, state }) => (
          <Link
            key={id}
            to={to}
            state={state}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-600)] transition-colors hover:bg-[var(--color-canvas)]"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}
