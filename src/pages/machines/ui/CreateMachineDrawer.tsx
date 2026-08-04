import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useCreateMachineMutation } from '@/entities/machine'
import { Button } from '@/shared/ui/Button'
import type { MachineGroupOption } from '../model/types'

interface CreateMachineDrawerProps {
  groupOptions: MachineGroupOption[]
  onClose: () => void
}

export function CreateMachineDrawer({ groupOptions, onClose }: CreateMachineDrawerProps) {
  const [name, setName] = useState('')
  const [groupKey, setGroupKey] = useState(groupOptions[0] ? `${groupOptions[0].groupId}|${groupOptions[0].workshopId}` : '')
  const [capacityPerHour, setCapacityPerHour] = useState(50)
  const createMutation = useCreateMachineMutation()

  const selectedGroup = groupOptions.find((g) => `${g.groupId}|${g.workshopId}` === groupKey)

  const handleSubmit = () => {
    if (!name.trim() || !selectedGroup || capacityPerHour <= 0) return
    createMutation.mutate(
      {
        name: name.trim(),
        workshopId: selectedGroup.workshopId,
        groupId: selectedGroup.groupId,
        groupName: selectedGroup.groupName,
        capacityPerHour,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">Новый станок</h2>
          <button onClick={onClose} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 px-5 py-4">
          <div>
            <label htmlFor="machine-name" className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">
              Название
            </label>
            <input
              id="machine-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Плазморез PC-900"
              className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </div>

          <div>
            <label htmlFor="machine-group" className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">
              Цех и группа станков
            </label>
            <select
              id="machine-group"
              value={groupKey}
              onChange={(e) => setGroupKey(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            >
              {groupOptions.map((g) => (
                <option key={`${g.groupId}|${g.workshopId}`} value={`${g.groupId}|${g.workshopId}`}>
                  {g.workshopName} — {g.groupName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--color-ink-400)]">Группа определяет, какие продукты можно на нём планировать.</p>
          </div>

          <div>
            <label htmlFor="machine-capacity" className="mb-1 block text-xs font-semibold text-[var(--color-ink-900)]">
              Производительность, шт/ч
            </label>
            <input
              id="machine-capacity"
              type="number"
              min={1}
              value={capacityPerHour}
              onChange={(e) => setCapacityPerHour(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm text-[var(--color-ink-900)] outline-none focus:border-[var(--color-brand-500)]"
            />
          </div>

          {createMutation.isError && <p className="text-xs font-medium text-red-600">Не удалось создать станок. Попробуйте ещё раз.</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={createMutation.isPending}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!name.trim() || !selectedGroup || capacityPerHour <= 0 || createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Создать станок
          </Button>
        </div>
      </div>
    </div>
  )
}
