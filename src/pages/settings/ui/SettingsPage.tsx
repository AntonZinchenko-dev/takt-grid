import { useState } from 'react'
import { Info } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MOCK_USERS = [
  { name: 'Иван Петров', role: 'Планировщик', email: 'i.petrov@company.ru' },
  { name: 'Ольга Смирнова', role: 'Администратор', email: 'o.smirnova@company.ru' },
  { name: 'Дмитрий Кузнецов', role: 'Просмотр', email: 'd.kuznetsov@company.ru' },
]

const ROLE_COLOR: Record<string, { color: string; bg: string }> = {
  Администратор: { color: 'var(--color-priority-critical)', bg: 'var(--color-priority-critical-bg)' },
  Планировщик: { color: 'var(--color-brand-600)', bg: 'var(--color-brand-50)' },
  Просмотр: { color: 'var(--color-ink-600)', bg: 'var(--color-canvas)' },
}

export function SettingsPage() {
  const [workingDays, setWorkingDays] = useState(new Set([0, 1, 2, 3, 4]))
  const [shiftStart, setShiftStart] = useState('08:00')
  const [shiftEnd, setShiftEnd] = useState('20:00')
  const [riskThresholdHours, setRiskThresholdHours] = useState(6)
  const [saved, setSaved] = useState(false)

  const toggleDay = (i: number) => {
    setWorkingDays((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
    setSaved(false)
  }

  return (
    <>
      <TopHeader title="Настройки" subtitle="Рабочий календарь, роли, пороги уведомлений" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-ink-600)]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Настройки хранятся только в текущей сессии — в проде это был бы отдельный write-эндпоинт с персистентностью.
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Рабочий календарь</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Рабочие дни</p>
                <div className="flex gap-1.5">
                  {WEEKDAYS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => toggleDay(i)}
                      className={`h-9 w-9 rounded-lg text-xs font-medium transition-colors ${
                        workingDays.has(i) ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-canvas)] text-[var(--color-ink-600)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                  Начало смены
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => {
                      setShiftStart(e.target.value)
                      setSaved(false)
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-[var(--color-ink-900)]">
                  Конец смены
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => {
                      setShiftEnd(e.target.value)
                      setSaved(false)
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
                  />
                </label>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Пороги уведомлений</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
                Считать заказ «риском срыва», если до дедлайна меньше, ч
                <input
                  type="range"
                  min={1}
                  max={48}
                  value={riskThresholdHours}
                  onChange={(e) => {
                    setRiskThresholdHours(Number(e.target.value))
                    setSaved(false)
                  }}
                  className="mt-2 w-full"
                />
                <span className="mt-1 block text-sm font-medium text-[var(--color-brand-600)]">{riskThresholdHours} ч</span>
              </label>
              <Button variant="primary" onClick={() => setSaved(true)}>
                Сохранить
              </Button>
              {saved && <p className="text-xs font-medium text-emerald-700">Сохранено (в рамках сессии)</p>}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Роли пользователей</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="divide-y divide-[var(--color-border)]">
                {MOCK_USERS.map((u) => {
                  const roleStyle = ROLE_COLOR[u.role] ?? ROLE_COLOR.Просмотр!
                  return (
                    <div key={u.email} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-[var(--color-ink-900)]">{u.name}</p>
                        <p className="text-xs text-[var(--color-ink-400)]">{u.email}</p>
                      </div>
                      <Badge color={roleStyle.color} bg={roleStyle.bg}>
                        {u.role}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    </>
  )
}
