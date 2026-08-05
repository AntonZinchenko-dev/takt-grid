import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Drawer } from '@/shared/ui/Drawer'
import { Button } from '@/shared/ui/Button'
import {
  useCreateTeamMemberMutation,
  useUpdateTeamMemberMutation,
  useDeleteTeamMemberMutation,
  type TeamMember,
  type TeamMemberStatus,
  type Role,
  type Group,
} from '@/entities/user'

const STATUS_OPTIONS: { value: TeamMemberStatus; label: string }[] = [
  { value: 'active', label: 'Активен' },
  { value: 'invited', label: 'Приглашён' },
  { value: 'disabled', label: 'Отключён' },
]

interface MemberDrawerProps {
  member: TeamMember | null
  roles: Role[]
  groups: Group[]
  onClose: () => void
}

export function MemberDrawer({ member, roles, groups, onClose }: MemberDrawerProps) {
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [roleId, setRoleId] = useState(member?.roleId ?? roles[0]?.id ?? '')
  const [groupIds, setGroupIds] = useState<string[]>(member?.groupIds ?? [])
  const [status, setStatus] = useState<TeamMemberStatus>(member?.status ?? 'invited')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const createMutation = useCreateTeamMemberMutation()
  const updateMutation = useUpdateTeamMemberMutation()
  const deleteMutation = useDeleteTeamMemberMutation()
  const saveMutation = member ? updateMutation : createMutation

  const isValid = name.trim().length > 0 && email.trim().length > 0 && roleId.length > 0

  const toggleGroup = (id: string) => setGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]))

  const handleSave = () => {
    if (!isValid) return
    const payload = { name: name.trim(), email: email.trim(), phone: phone.trim(), roleId, groupIds, status }
    if (member) updateMutation.mutate({ id: member.id, ...payload })
    else createMutation.mutate(payload, { onSuccess: onClose })
  }

  const handleDelete = () => {
    if (!member) return
    deleteMutation.mutate(member.id, { onSuccess: onClose })
  }

  return (
    <Drawer title={member ? member.name : 'Новый пользователь'} subtitle="Пользователи и роли" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Имя
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]" />
        </label>
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]" />
        </label>
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Телефон
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]" />
        </label>
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Роль
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm">
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-ink-900)]">Статус</p>
          <div className="flex gap-3">
            {STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-xs text-[var(--color-ink-900)]">
                <input type="radio" checked={status === opt.value} onChange={() => setStatus(opt.value)} className="accent-[var(--color-brand-600)]" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--color-ink-900)]">Группы</p>
          <div className="space-y-1.5">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-xs text-[var(--color-ink-900)]">
                <input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} className="h-3.5 w-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]" />
                {g.name}
              </label>
            ))}
          </div>
        </div>

        <Button variant="primary" className="w-full" onClick={handleSave} disabled={!isValid || saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {member ? 'Сохранить изменения' : 'Добавить пользователя'}
        </Button>
        {updateMutation.isSuccess && member && <p className="text-xs font-medium text-emerald-700">Изменения сохранены</p>}
        {saveMutation.isError && <p className="text-xs font-medium text-red-600">Не удалось сохранить.</p>}
      </div>

      {member && (
        <div className="rounded-lg border border-red-200 p-3">
          <p className="mb-2 text-xs font-semibold text-red-700">Опасная зона</p>
          {!confirmingDelete ? (
            <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmingDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Удалить пользователя
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-700">Пользователь будет удалён без возможности отмены.</p>
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
