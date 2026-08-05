import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Drawer } from '@/shared/ui/Drawer'
import { Button } from '@/shared/ui/Button'
import { useCreateGroupMutation, useUpdateGroupMutation, useDeleteGroupMutation, type Group, type TeamMember } from '@/entities/user'

interface GroupDrawerProps {
  group: Group | null
  members: TeamMember[]
  onClose: () => void
}

export function GroupDrawer({ group, members, onClose }: GroupDrawerProps) {
  const [name, setName] = useState(group?.name ?? '')
  const [memberIds, setMemberIds] = useState<string[]>(group?.memberIds ?? [])
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const createMutation = useCreateGroupMutation()
  const updateMutation = useUpdateGroupMutation()
  const deleteMutation = useDeleteGroupMutation()
  const saveMutation = group ? updateMutation : createMutation

  const isValid = name.trim().length > 0

  const toggleMember = (id: string) => setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))

  const handleSave = () => {
    if (!isValid) return
    const payload = { name: name.trim(), memberIds }
    if (group) updateMutation.mutate({ id: group.id, ...payload })
    else createMutation.mutate(payload, { onSuccess: onClose })
  }

  const handleDelete = () => {
    if (!group) return
    deleteMutation.mutate(group.id, { onSuccess: onClose })
  }

  return (
    <Drawer title={group ? group.name : 'Новая группа'} subtitle="Пользователи и роли" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Название группы
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]" />
        </label>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-ink-900)]">Участники</p>
          <div className="space-y-1.5">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-xs text-[var(--color-ink-900)]">
                <input type="checkbox" checked={memberIds.includes(m.id)} onChange={() => toggleMember(m.id)} className="h-3.5 w-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]" />
                {m.name}
              </label>
            ))}
            {members.length === 0 && <p className="text-xs text-[var(--color-ink-400)]">Нет пользователей</p>}
          </div>
        </div>

        <Button variant="primary" className="w-full" onClick={handleSave} disabled={!isValid || saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {group ? 'Сохранить изменения' : 'Добавить группу'}
        </Button>
        {updateMutation.isSuccess && group && <p className="text-xs font-medium text-emerald-700">Изменения сохранены</p>}
      </div>

      {group && (
        <div className="rounded-lg border border-red-200 p-3">
          <p className="mb-2 text-xs font-semibold text-red-700">Опасная зона</p>
          {!confirmingDelete ? (
            <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Удалить группу
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-700">Группа будет удалена без возможности отмены. Пользователи из неё не удаляются.</p>
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
