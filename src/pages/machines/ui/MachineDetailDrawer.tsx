import { useState } from 'react'
import { X, Loader2, Wrench, Trash2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Machine, DowntimeRule } from '@/entities/machine'
import { useCreateDowntimeRuleMutation, useUpdateMachineMutation, useDeleteMachineMutation } from '@/entities/machine'
import { Button } from '@/shared/ui/Button'
import type { MachineGroupOption } from '../model/types'

const REASONS = ['Плановое ТО', 'Техобслуживание', 'Переналадка', 'Поломка']
const STATUS_LABEL: Record<Machine['status'], string> = { running: 'Работает', idle: 'Простой', down: 'Авария' }
const STATUS_COLOR: Record<Machine['status'], string> = { running: '#16a34a', idle: '#eab308', down: '#dc2626' }
const STATUS_OPTIONS: Machine['status'][] = ['running', 'idle', 'down']

interface MachineDetailDrawerProps {
  machine: Machine
  workshopName: string
  downtimeRules: DowntimeRule[]
  groupOptions: MachineGroupOption[]
  assignedOrdersCount: number
  onClose: () => void
}

export function MachineDetailDrawer({ machine, workshopName, downtimeRules, groupOptions, assignedOrdersCount, onClose }: MachineDetailDrawerProps) {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [startHour, setStartHour] = useState(8)
  const [duration, setDuration] = useState(4)
  const [reason, setReason] = useState(REASONS[0]!)
  const createMutation = useCreateDowntimeRuleMutation()

  const [editName, setEditName] = useState(machine.name)
  const [editGroupKey, setEditGroupKey] = useState(`${machine.groupId}|${machine.workshopId}`)
  const [editCapacity, setEditCapacity] = useState(machine.capacityPerHour)
  const [editStatus, setEditStatus] = useState(machine.status)
  const updateMutation = useUpdateMachineMutation()
  const deleteMutation = useDeleteMachineMutation()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const sorted = [...downtimeRules].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  const handleAdd = () => {
    const start = new Date(`${date}T00:00:00`)
    start.setHours(startHour, 0, 0, 0)
    const end = new Date(start.getTime() + duration * 3_600_000)
    createMutation.mutate({ machineId: machine.id, startAt: start.toISOString(), endAt: end.toISOString(), reason, recurrence: 'once' })
  }

  const unassignedCount = createMutation.data?.unassignedCount ?? 0

  const editSelectedGroup = groupOptions.find((g) => `${g.groupId}|${g.workshopId}` === editGroupKey)
  const groupIsChanging = Boolean(editSelectedGroup && editSelectedGroup.groupId !== machine.groupId)

  const handleSaveEdit = () => {
    if (!editName.trim() || !editSelectedGroup || editCapacity <= 0) return
    updateMutation.mutate({
      id: machine.id,
      name: editName.trim(),
      workshopId: editSelectedGroup.workshopId,
      groupId: editSelectedGroup.groupId,
      groupName: editSelectedGroup.groupName,
      capacityPerHour: editCapacity,
      status: editStatus,
    })
  }

  const editUnassignedCount = updateMutation.data?.unassignedCount ?? 0

  const handleDelete = () => {
    deleteMutation.mutate(machine.id, { onSuccess: onClose })
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
            {createMutation.isSuccess && (
              <p className="mt-2 text-xs font-medium text-emerald-700">
                Добавлено — отразится в матрице планирования
                {unassignedCount > 0 &&
                  ` · ${unassignedCount} ${pluralizeOrders(unassignedCount)} снято с графика и помечено «нуждается в переназначении»`}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Редактировать станок</p>
            <div className="space-y-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Название"
                className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
              />
              <select
                value={editGroupKey}
                onChange={(e) => setEditGroupKey(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
              >
                {groupOptions.map((g) => (
                  <option key={`${g.groupId}|${g.workshopId}`} value={`${g.groupId}|${g.workshopId}`}>
                    {g.workshopName} — {g.groupName}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
                />
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Machine['status'])}
                  className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>

              {groupIsChanging && assignedOrdersCount > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--color-status-reassign)] bg-[var(--color-status-reassign-bg)] px-3 py-2 text-xs font-medium text-[var(--color-status-reassign)]">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Смена группы снимет с графика заказы, которые больше не подходят под неё, и пометит их «нуждается в переназначении».</span>
                </div>
              )}

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleSaveEdit}
                disabled={!editName.trim() || !editSelectedGroup || editCapacity <= 0 || updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Сохранить изменения
              </Button>
              {updateMutation.isSuccess && (
                <p className="text-xs font-medium text-emerald-700">
                  Изменения сохранены
                  {editUnassignedCount > 0 && ` · ${editUnassignedCount} ${pluralizeOrders(editUnassignedCount)} снято с графика и помечено «нуждается в переназначении»`}
                </p>
              )}
              {updateMutation.isError && <p className="text-xs font-medium text-red-600">Не удалось сохранить изменения.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-red-200 p-3">
            <p className="mb-2 text-xs font-semibold text-red-700">Опасная зона</p>
            {!confirmingDelete ? (
              <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Удалить станок
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-700">
                  {assignedOrdersCount > 0
                    ? `Будет снято с графика ${assignedOrdersCount} ${pluralizeOrders(assignedOrdersCount)} — они пометятся «нуждается в переназначении». Действие необратимо.`
                    : 'Станок будет удалён без возможности отмены.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmingDelete(false)} disabled={deleteMutation.isPending}>
                    Отмена
                  </Button>
                  <Button variant="danger" size="sm" className="flex-1" onClick={handleDelete} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Да, удалить
                  </Button>
                </div>
              </div>
            )}
            {deleteMutation.isError && <p className="mt-2 text-xs font-medium text-red-600">Не удалось удалить станок.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function pluralizeOrders(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'заказ'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'заказа'
  return 'заказов'
}
