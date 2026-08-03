import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TopHeader } from '@/widgets/top-header'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { useHolidayOverridesQuery, useToggleHolidayMutation } from '@/entities/holiday'
import { cn } from '@/shared/lib/cn'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const holidaysQuery = useHolidayOverridesQuery()
  const toggleHoliday = useToggleHolidayMutation()
  const overrides = useMemo(() => new Set(holidaysQuery.data ?? []), [holidaysQuery.data])

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })

  const days = useMemo(() => {
    const result: Date[] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      result.push(cursor)
      cursor = addDays(cursor, 1)
    }
    return result
  }, [gridStart, gridEnd])

  const assignmentsQuery = useAssignmentsWindowQuery(gridStart.toISOString(), gridEnd.toISOString())

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of assignmentsQuery.data ?? []) {
      const key = format(new Date(a.startAt), 'yyyy-MM-dd')
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [assignmentsQuery.data])

  return (
    <>
      <TopHeader
        title="Календарь"
        subtitle="Рабочий календарь и загрузка по дням"
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" aria-label="Предыдущий месяц" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="w-32 text-center text-sm font-medium capitalize text-[var(--color-ink-900)]">{format(month, 'LLLL yyyy', { locale: ru })}</span>
            <Button size="sm" variant="secondary" aria-label="Следующий месяц" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setMonth(startOfMonth(new Date()))}>
              Сегодня
            </Button>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-3 flex items-center gap-4 text-xs text-[var(--color-ink-600)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-canvas)] ring-1 ring-[var(--color-border)]" /> Выходной по умолчанию
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-priority-critical-bg)' }} /> Отмечен вручную
          </span>
          <span>Клик по дню — отметить/снять выходной. Клик по счётчику заказов — открыть в матрице.</span>
        </div>

        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-canvas)]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-3 py-2 text-center text-xs font-medium text-[var(--color-ink-600)]">
                {d}
              </div>
            ))}
          </div>
          {assignmentsQuery.isLoading || holidaysQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const isDefaultWeekend = day.getDay() === 0 || day.getDay() === 6
                const isOverridden = overrides.has(key)
                // Ручное переключение инвертирует дефолтный статус: будний день → выходной, выходной → рабочий.
                const isHoliday = isDefaultWeekend ? !isOverridden : isOverridden
                const isPending = toggleHoliday.isPending && toggleHoliday.variables === key
                const inMonth = isSameMonth(day, month)
                const count = countsByDay.get(key) ?? 0

                return (
                  <button
                    key={key}
                    onClick={() => toggleHoliday.mutate(key)}
                    disabled={isPending}
                    title={isOverridden ? 'Отмечено вручную — клик, чтобы вернуть по умолчанию' : isDefaultWeekend ? 'Выходной по умолчанию — клик, чтобы сделать рабочим' : 'Клик, чтобы отметить выходным'}
                    className={cn(
                      'flex h-24 flex-col items-start gap-1 border-b border-r border-[var(--color-border)] p-2 text-left transition-colors hover:bg-[var(--color-canvas)] disabled:cursor-wait',
                      isOverridden && 'bg-[var(--color-priority-critical-bg)]/40 ring-1 ring-inset ring-[var(--color-priority-critical-bg)]',
                      !isOverridden && isDefaultWeekend && 'bg-[var(--color-canvas)]',
                    )}
                  >
                    {/* Приглушаем только день/метку вне текущего месяца, не бейдж заказов ниже —
                        он остаётся кликабельной ссылкой и должен читаться на контрасте WCAG AA. */}
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isToday(day) ? 'bg-[var(--color-brand-600)] text-white' : 'text-[var(--color-ink-900)]',
                        !inMonth && 'opacity-65',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {isHoliday && <span className="text-[10px] font-medium text-[var(--color-ink-600)]">Выходной</span>}
                    {count > 0 && (
                      <Link
                        to="/matrix"
                        state={{ jumpToIso: day.toISOString() }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-md bg-[var(--color-brand-50)] px-1.5 py-1 text-[11px] font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {count} заказ{count === 1 ? '' : count < 5 ? 'а' : 'ов'}
                      </Link>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      </main>
    </>
  )
}
