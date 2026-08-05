import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Drawer } from '@/shared/ui/Drawer'
import { Button } from '@/shared/ui/Button'
import { useCreateShiftMutation, useUpdateShiftMutation, useDeleteShiftMutation, type Shift } from '@/entities/shift'

const COLOR_PRESETS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2']

interface ShiftDrawerProps {
  shift: Shift | null
  onClose: () => void
}

export function ShiftDrawer({ shift, onClose }: ShiftDrawerProps) {
  const [name, setName] = useState(shift?.name ?? '')
  const [color, setColor] = useState(shift?.color ?? COLOR_PRESETS[0]!)
  const [startTime, setStartTime] = useState(shift?.startTime ?? '08:00')
  const [endTime, setEndTime] = useState(shift?.endTime ?? '17:00')
  const [breakStart, setBreakStart] = useState(shift?.breakStart ?? '12:00')
  const [breakEnd, setBreakEnd] = useState(shift?.breakEnd ?? '12:30')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const createMutation = useCreateShiftMutation()
  const updateMutation = useUpdateShiftMutation()
  const deleteMutation = useDeleteShiftMutation()

  const isValid = name.trim().length > 0
  const saveMutation = shift ? updateMutation : createMutation

  const handleSave = () => {
    if (!isValid) return
    const payload = { name: name.trim(), color, startTime, endTime, breakStart, breakEnd }
    if (shift) updateMutation.mutate({ id: shift.id, ...payload })
    else createMutation.mutate(payload, { onSuccess: onClose })
  }

  const handleDelete = () => {
    if (!shift) return
    deleteMutation.mutate(shift.id, { onSuccess: onClose })
  }

  return (
    <Drawer title={shift ? 'Редактировать смену' : 'Новая смена'} subtitle="Рабочий календарь" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Название
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Смена А (Основная)"
            className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]"
          />
        </label>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-ink-900)]">Цвет</p>
          <div className="flex gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full ring-offset-2 transition-shadow"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[var(--color-ink-900)]">
            Начало смены
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-[var(--color-ink-900)]">
            Конец смены
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-[var(--color-ink-900)]">
            Начало перерыва
            <input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-[var(--color-ink-900)]">
            Конец перерыва
            <input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm" />
          </label>
        </div>

        <Button variant="primary" className="w-full" onClick={handleSave} disabled={!isValid || saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {shift ? 'Сохранить изменения' : 'Добавить смену'}
        </Button>
        {updateMutation.isSuccess && shift && <p className="text-xs font-medium text-emerald-700">Изменения сохранены</p>}
        {saveMutation.isError && <p className="text-xs font-medium text-red-600">Не удалось сохранить смену.</p>}
      </div>

      {shift && (
        <div className="rounded-lg border border-red-200 p-3">
          <p className="mb-2 text-xs font-semibold text-red-700">Опасная зона</p>
          {!confirmingDelete ? (
            <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Удалить смену
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-700">Смена будет удалена без возможности отмены.</p>
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
        </div>
      )}
    </Drawer>
  )
}
