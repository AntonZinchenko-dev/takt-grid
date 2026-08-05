import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Switch } from '@/shared/ui/Switch'
import { usePlanningSettingsStore, type SchedulingAlgorithm } from '@/entities/setting'
import { priorityLabel, priorityColorVar, priorityBgVar, type OrderPriority } from '@/entities/order'
import { Badge } from '@/shared/ui/Badge'

const ALGORITHMS: { value: SchedulingAlgorithm; label: string; description: string }[] = [
  { value: 'fifo', label: 'FIFO', description: 'В порядке поступления заказов, без учёта приоритета и дедлайна' },
  { value: 'priority', label: 'По приоритету', description: 'Заказы с более высоким приоритетом планируются раньше' },
  { value: 'deadline', label: 'По дедлайну', description: 'Заказы с более близким сроком исполнения планируются раньше' },
]

const PRIORITIES: OrderPriority[] = ['low', 'normal', 'high', 'critical']

export function PlanningTab() {
  const settings = usePlanningSettingsStore()

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Общие параметры</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Горизонт планирования, дней
              <input
                type="number"
                min={1}
                max={365}
                value={settings.orderHorizonDays}
                onChange={(e) => settings.setOrderHorizonDays(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Буфер между операциями, мин
              <input
                type="number"
                min={0}
                max={240}
                value={settings.bufferMinutes}
                onChange={(e) => settings.setBufferMinutes(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[var(--color-ink-900)]">Разрешить перегрузку станков</p>
              <p className="text-xs text-[var(--color-ink-400)]">Допускать назначения сверх номинальной производительности станка</p>
            </div>
            <Switch checked={settings.allowOverbooking} onChange={settings.setAllowOverbooking} label="Разрешить перегрузку станков" />
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Расчёт загрузки</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {ALGORITHMS.map((alg) => (
            <label
              key={alg.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-2.5 has-[:checked]:border-[var(--color-brand-500)] has-[:checked]:bg-[var(--color-brand-50)]"
            >
              <input
                type="radio"
                checked={settings.schedulingAlgorithm === alg.value}
                onChange={() => settings.setSchedulingAlgorithm(alg.value)}
                className="mt-0.5 accent-[var(--color-brand-600)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-ink-900)]">{alg.label}</p>
                <p className="text-xs text-[var(--color-ink-400)]">{alg.description}</p>
              </div>
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Приоритеты заказов</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs text-[var(--color-ink-600)]">Вес приоритета влияет на очерёдность планирования при прочих равных условиях — чем выше вес, тем раньше заказ встанет в график.</p>
          {PRIORITIES.map((priority) => (
            <div key={priority} className="flex items-center gap-3">
              <Badge color={priorityColorVar(priority)} bg={priorityBgVar(priority)} className="w-36 shrink-0 justify-center">
                {priorityLabel(priority)}
              </Badge>
              <input
                type="range"
                min={1}
                max={10}
                value={settings.priorityWeights[priority]}
                onChange={(e) => settings.setPriorityWeight(priority, Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-[var(--color-ink-900)]">{settings.priorityWeights[priority]}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
