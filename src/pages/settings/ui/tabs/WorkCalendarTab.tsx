import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, Plus, Settings2 } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { cn } from '@/shared/lib/cn'
import {
  useHolidayOverridesQuery,
  useToggleHolidayMutation,
  useShiftsQuery,
  useWorkCalendarQuery,
  useUpdateWorkCalendarMutation,
  type Shift,
} from '@/entities/shift'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { matrixJumpLink } from '@/shared/lib/deep-links'
import { ShiftDrawer } from '../drawers/ShiftDrawer'
import { shiftDurationLabel } from '../../lib/shift-duration'
import { SettingsOverviewStrip } from './SettingsOverviewStrip'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function WorkCalendarTab() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [editingShift, setEditingShift] = useState<Shift | null | undefined>(undefined)

  const holidaysQuery = useHolidayOverridesQuery()
  const toggleHoliday = useToggleHolidayMutation()
  const overrides = useMemo(() => new Set(holidaysQuery.data ?? []), [holidaysQuery.data])

  const shiftsQuery = useShiftsQuery()
  const workCalendarQuery = useWorkCalendarQuery()
  const updateWorkCalendar = useUpdateWorkCalendarMutation()
  const workingDays = new Set(workCalendarQuery.data?.workingDays ?? [0, 1, 2, 3, 4])

  const toggleWorkingDay = (i: number) => {
    const next = new Set(workingDays)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    updateWorkCalendar.mutate({ workingDays: Array.from(next).sort() })
  }

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

  const selectedKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedIsDefaultWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6
  const selectedIsOverridden = overrides.has(selectedKey)
  const selectedIsHoliday = selectedIsDefaultWeekend ? !selectedIsOverridden : selectedIsOverridden

  const upcomingOverrides = useMemo(
    () =>
      [...overrides]
        .sort()
        .filter((d) => d >= format(new Date(), 'yyyy-MM-dd'))
        .slice(0, 6),
    [overrides],
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Рабочий календарь</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">Настройка рабочих дней, смен, выходных и праздников</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditingShift(null)}>
              <Settings2 className="h-3.5 w-3.5" />
              Настроить график смен
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Рабочие дни по умолчанию</p>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => toggleWorkingDay(i)}
                    disabled={workCalendarQuery.isLoading}
                    className={cn(
                      'h-9 w-9 rounded-lg text-xs font-medium transition-colors',
                      workingDays.has(i) ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-canvas)] text-[var(--color-ink-600)]',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-[var(--color-ink-900)]">{format(month, 'LLLL yyyy', { locale: ru })}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" aria-label="Предыдущий месяц" onClick={() => setMonth((m) => subMonths(m, 1))}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Следующий месяц" onClick={() => setMonth((m) => addMonths(m, 1))}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className="grid grid-cols-7 bg-[var(--color-canvas)]">
                    {WEEKDAYS.map((d) => (
                      <div key={d} className="py-1.5 text-center text-[10px] font-medium text-[var(--color-ink-600)]">
                        {d}
                      </div>
                    ))}
                  </div>
                  {holidaysQuery.isLoading ? (
                    <div className="flex items-center justify-center py-10 text-[var(--color-ink-400)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-7">
                      {days.map((day) => {
                        const key = format(day, 'yyyy-MM-dd')
                        const isDefaultWeekend = day.getDay() === 0 || day.getDay() === 6
                        const isOverridden = overrides.has(key)
                        const isHoliday = isDefaultWeekend ? !isOverridden : isOverridden
                        const inMonth = isSameMonth(day, month)
                        const isSelected = key === selectedKey
                        const count = countsByDay.get(key) ?? 0
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedDate(day)}
                            title={isOverridden ? 'Отмечено вручную — переключить в блоке ниже' : isDefaultWeekend ? 'Выходной по умолчанию' : 'Рабочий день'}
                            className={cn(
                              'flex h-16 flex-col items-center gap-0.5 border-b border-r border-[var(--color-border)] py-1 text-xs transition-colors hover:bg-[var(--color-canvas)]',
                              isHoliday && 'bg-[var(--color-priority-critical-bg)]/40',
                              isSelected && 'ring-2 ring-inset ring-[var(--color-brand-600)]',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full font-medium',
                                isToday(day) ? 'bg-[var(--color-brand-600)] text-white' : 'text-[var(--color-ink-900)]',
                                !inMonth && 'opacity-50',
                              )}
                            >
                              {format(day, 'd')}
                            </span>
                            {isHoliday && <span className="text-[9px] font-medium text-[var(--color-ink-600)]">Выходной</span>}
                            {count > 0 && (
                              <Link
                                to={matrixJumpLink(day.toISOString())}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded bg-[var(--color-brand-50)] px-1 py-0.5 text-[10px] font-medium text-[var(--color-brand-700)] hover:underline"
                              >
                                {count} зак.
                              </Link>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--color-ink-600)]">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-[var(--color-canvas)] ring-1 ring-[var(--color-border)]" /> Рабочий день
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: 'var(--color-priority-critical-bg)' }} /> Выходной
                    </span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => toggleHoliday.mutate(selectedKey)} disabled={toggleHoliday.isPending}>
                    {selectedIsHoliday ? 'Сделать рабочим' : 'Отметить выходным'}
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Смены в выбранный день ({format(selectedDate, 'dd.MM.yyyy')})</p>
                {shiftsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-10 text-[var(--color-ink-400)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {(shiftsQuery.data ?? []).map((shift) => (
                      <button
                        key={shift.id}
                        onClick={() => setEditingShift(shift)}
                        className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-xs hover:bg-[var(--color-canvas)]"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: shift.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--color-ink-900)]">{shift.name}</p>
                          <p className="text-[var(--color-ink-400)]">
                            {shift.startTime} – {shift.endTime} · {shiftDurationLabel(shift)}
                          </p>
                        </div>
                        <span className="shrink-0 text-[var(--color-ink-400)]">
                          {shift.breakStart} – {shift.breakEnd}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => setEditingShift(null)}>
                  <Plus className="h-3.5 w-3.5" />
                  Добавить смену
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Праздники и исключения</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {upcomingOverrides.length === 0 && <p className="text-xs text-[var(--color-ink-400)]">Нет отмеченных исключений</p>}
            {upcomingOverrides.map((date) => {
              const isDefaultWeekend = new Date(`${date}T00:00:00`).getDay() === 0 || new Date(`${date}T00:00:00`).getDay() === 6
              return (
                <div key={date} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-ink-900)]">{format(new Date(`${date}T00:00:00`), 'd MMMM', { locale: ru })}</span>
                  <span className="text-xs text-[var(--color-ink-400)]">{format(new Date(`${date}T00:00:00`), 'EEEE', { locale: ru })}</span>
                  <Badge color={isDefaultWeekend ? 'var(--color-brand-600)' : 'var(--color-priority-critical)'} bg={isDefaultWeekend ? 'var(--color-brand-50)' : 'var(--color-priority-critical-bg)'}>
                    {isDefaultWeekend ? 'Рабочий' : 'Выходной'}
                  </Badge>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      <SettingsOverviewStrip />

      {editingShift !== undefined && <ShiftDrawer shift={editingShift} onClose={() => setEditingShift(undefined)} />}
    </div>
  )
}
