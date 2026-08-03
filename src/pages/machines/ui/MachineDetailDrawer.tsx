import { useState } from 'react'
import { X, Loader2, Wrench } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Machine, DowntimeRule } from '@/entities/machine'
import { useCreateDowntimeRuleMutation } from '@/entities/machine'
import { Button } from '@/shared/ui/Button'

const REASONS = ['Плановое ТО', 'Техобслуживание', 'Переналадка', 'Поломка']
const STATUS_LABEL: Record<Machine['status'], string> = { running: 'Работает', idle: 'Простой', down: 'Авария' }
const STATUS_COLOR: Record<Machine['status'], string> = { running: '#16a34a', idle: '#eab308', down: '#dc2626' }

interface MachineDetailDrawerProps {
  machine: Machine
  workshopName: string
  downtimeRules: DowntimeRule[]
  onClose: () => void
}

export function MachineDetailDrawer({ machine, workshopName, downtimeRules, onClose }: MachineDetailDrawerProps) {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [startHour, setStartHour] = useState(8)
  const [duration, setDuration] = useState(4)
  const [reason, setReason] = useState(REASONS[0]!)
  const createMutation = useCreateDowntimeRuleMutation()

  const sorted = [...downtimeRules].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  const handleAdd = () => {
    const start = new Date(`${date}T00:00:00`)
    start.setHours(startHour, 0, 0, 0)
    const end = new Date(start.getTime() + duration * 3_600_000)
    createMutation.mutate({ machineId: machine.id, startAt: start.toISOString(), endAt: end.toISOString(), reason, recurrence: 'once' })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{machine.name}</h2>
            <p className="text-xs text-[var(--color-ink-600)]">
              {workshopName} · {machine.groupName}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs">
            <div>
              <p className="text-[var(--color-ink-400)]">Статус</p>
              <p className="flex items-center gap-1.5 font-medium text-[var(--color-ink-900)]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[machine.status] }} />
                {STATUS_LABEL[machine.status]}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Производительность</p>
              <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{machine.capacityPerHour} шт/ч</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">История простоев и ТО</p>
            <div className="space-y-1.5">
              {sorted.slice(0, 10).map((rule) => (
                <div key={rule.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 text-[var(--color-ink-900)]">
                    <Wrench className="h-3.5 w-3.5 text-[var(--color-ink-400)]" />
                    {rule.reason}
                  </span>
                  <span className="text-[var(--color-ink-600)]">{format(new Date(rule.startAt), 'd MMM, HH:mm', { locale: ru })}</span>
                </div>
              ))}
              {sorted.length === 0 && <p className="text-xs text-[var(--color-ink-400)]">Простоев не зафиксировано</p>}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Добавить простой / ТО</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-lg border border-[var(--color-border)] px-2 text-sm" />
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 rounded-lg border border-[var(--color-border)] px-2 text-sm">
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <label className="text-xs text-[var(--color-ink-600)]">
                Начало (час)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--color-ink-600)]">
                Длительность, ч
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2 text-sm"
                />
              </label>
            </div>
            <Button variant="primary" size="sm" className="mt-3 w-full" onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Добавить
            </Button>
            {createMutation.isSuccess && <p className="mt-2 text-xs font-medium text-emerald-600">Добавлено — отразится в матрице планирования</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
