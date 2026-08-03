import { useState } from 'react'
import { Calendar, CalendarRange, Flag, Wrench, Clock3, RotateCcw } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { cn } from '@/shared/lib/cn'

const FILTERS = [
  { id: 'today', label: 'Сегодня', icon: Calendar },
  { id: 'week', label: 'Эта неделя', icon: CalendarRange },
  { id: 'high-priority', label: 'Высокий приоритет', icon: Flag },
  { id: 'maintenance', label: 'Техобслуживание', icon: Wrench },
  { id: 'overdue', label: 'Просроченные', icon: Clock3 },
] as const

export function QuickFilters() {
  const [active, setActive] = useState<string>('today')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Быстрые фильтры</CardTitle>
      </CardHeader>
      <CardBody className="space-y-1">
        {FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
              active === id ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]' : 'text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        <button
          onClick={() => setActive('today')}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-400)] hover:bg-[var(--color-canvas)]"
        >
          <RotateCcw className="h-4 w-4" />
          Сбросить фильтры
        </button>
      </CardBody>
    </Card>
  )
}
