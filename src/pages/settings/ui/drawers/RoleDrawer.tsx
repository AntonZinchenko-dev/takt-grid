import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Drawer } from '@/shared/ui/Drawer'
import { Button } from '@/shared/ui/Button'
import { useCreateRoleMutation, useUpdateRoleMutation, useDeleteRoleMutation, PERMISSIONS, type Role } from '@/entities/user'

const COLOR_PRESETS = [
  { color: 'var(--color-priority-critical)', bg: 'var(--color-priority-critical-bg)' },
  { color: 'var(--color-brand-600)', bg: 'var(--color-brand-50)' },
  { color: 'var(--color-priority-normal)', bg: 'var(--color-priority-normal-bg)' },
  { color: 'var(--color-ink-600)', bg: 'var(--color-canvas)' },
]

interface RoleDrawerProps {
  role: Role | null
  memberCount: number
  onClose: () => void
}

export function RoleDrawer({ role, memberCount, onClose }: RoleDrawerProps) {
  const [name, setName] = useState(role?.name ?? '')
  const [colorIndex, setColorIndex] = useState(() => Math.max(0, COLOR_PRESETS.findIndex((c) => c.color === role?.color)))
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? [])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const createMutation = useCreateRoleMutation()
  const updateMutation = useUpdateRoleMutation()
  const deleteMutation = useDeleteRoleMutation()
  const saveMutation = role ? updateMutation : createMutation

  const isValid = name.trim().length > 0

  const togglePermission = (key: string) => setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]))

  const handleSave = () => {
    if (!isValid) return
    const preset = COLOR_PRESETS[colorIndex]!
    const payload = { name: name.trim(), color: preset.color, bg: preset.bg, permissions }
    if (role) updateMutation.mutate({ id: role.id, ...payload })
    else createMutation.mutate(payload, { onSuccess: onClose })
  }

  const handleDelete = () => {
    if (!role) return
    setDeleteError(null)
    deleteMutation.mutate(role.id, {
      onSuccess: onClose,
      onError: (err) => setDeleteError(err.message || 'Не удалось удалить роль.'),
    })
  }

  return (
    <Drawer title={role ? role.name : 'Новая роль'} subtitle="Пользователи и роли" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Название роли
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]" />
        </label>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-ink-900)]">Цвет бейджа</p>
          <div className="flex gap-1.5">
            {COLOR_PRESETS.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setColorIndex(i)}
                className="h-7 w-7 rounded-full ring-offset-2 transition-shadow"
                style={{ backgroundColor: preset.color, boxShadow: colorIndex === i ? `0 0 0 2px ${preset.color}` : undefined }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-ink-900)]">Права доступа</p>
          <div className="space-y-1.5">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-xs text-[var(--color-ink-900)]">
                <input
                  type="checkbox"
                  checked={permissions.includes(p.key)}
                  onChange={() => togglePermission(p.key)}
                  className="h-3.5 w-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]"
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <Button variant="primary" className="w-full" onClick={handleSave} disabled={!isValid || saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {role ? 'Сохранить изменения' : 'Добавить роль'}
        </Button>
        {updateMutation.isSuccess && role && <p className="text-xs font-medium text-emerald-700">Изменения сохранены</p>}
      </div>

      {role && (
        <div className="rounded-lg border border-red-200 p-3">
          <p className="mb-2 text-xs font-semibold text-red-700">Опасная зона</p>
          {!confirmingDelete ? (
            <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Удалить роль
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-700">
                {memberCount > 0 ? `Роль назначена ${memberCount} сотрудникам — сначала переназначьте им другую роль.` : 'Роль будет удалена без возможности отмены.'}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmingDelete(false)} disabled={deleteMutation.isPending}>
                  Отмена
                </Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={handleDelete} disabled={deleteMutation.isPending || memberCount > 0}>
                  {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Да, удалить
                </Button>
              </div>
            </div>
          )}
          {deleteError && <p className="mt-2 text-xs font-medium text-red-600">{deleteError}</p>}
        </div>
      )}
    </Drawer>
  )
}
