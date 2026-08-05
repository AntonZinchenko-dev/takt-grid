import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'
import { Pagination } from '@/shared/ui/Pagination'
import { cn } from '@/shared/lib/cn'
import { useTeamMembersQuery, useRolesQuery, useGroupsQuery, type TeamMember, type Role, type Group } from '@/entities/user'
import { MemberDrawer } from '../drawers/MemberDrawer'
import { RoleDrawer } from '../drawers/RoleDrawer'
import { GroupDrawer } from '../drawers/GroupDrawer'

const STATUS_LABEL: Record<TeamMember['status'], string> = { active: 'Активен', invited: 'Приглашён', disabled: 'Отключён' }
const STATUS_COLOR: Record<TeamMember['status'], { color: string; bg: string }> = {
  active: { color: 'var(--color-priority-low)', bg: 'var(--color-priority-low-bg)' },
  invited: { color: 'var(--color-priority-high)', bg: 'var(--color-priority-high-bg)' },
  disabled: { color: 'var(--color-ink-600)', bg: 'var(--color-canvas)' },
}
const PAGE_SIZE = 15
const SUBVIEWS = [
  { id: 'members', label: 'Пользователи' },
  { id: 'roles', label: 'Роли и права' },
  { id: 'groups', label: 'Группы' },
] as const
type SubviewId = (typeof SUBVIEWS)[number]['id']

export function UsersTab() {
  const [subview, setSubview] = useState<SubviewId>('members')
  const [page, setPage] = useState(1)
  const [editingMember, setEditingMember] = useState<TeamMember | null | undefined>(undefined)
  const [editingRole, setEditingRole] = useState<Role | null | undefined>(undefined)
  const [editingGroup, setEditingGroup] = useState<Group | null | undefined>(undefined)

  const membersQuery = useTeamMembersQuery()
  const rolesQuery = useRolesQuery()
  const groupsQuery = useGroupsQuery()

  const roleById = new Map((rolesQuery.data ?? []).map((r) => [r.id, r]))
  const groupById = new Map((groupsQuery.data ?? []).map((g) => [g.id, g]))
  const memberCountByRole = new Map<string, number>()
  for (const m of membersQuery.data ?? []) memberCountByRole.set(m.roleId, (memberCountByRole.get(m.roleId) ?? 0) + 1)

  const allMembers = membersQuery.data ?? []
  const pageMembers = allMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-[var(--color-canvas)] p-1">
          {SUBVIEWS.map((sv) => (
            <button
              key={sv.id}
              onClick={() => setSubview(sv.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                subview === sv.id ? 'bg-[var(--color-surface)] text-[var(--color-ink-900)] shadow-sm' : 'text-[var(--color-ink-600)]',
              )}
            >
              {sv.label}
            </button>
          ))}
        </div>
        {subview === 'members' && (
          <Button size="sm" variant="secondary" onClick={() => setEditingMember(null)}>
            <Plus className="h-4 w-4" />
            Добавить пользователя
          </Button>
        )}
        {subview === 'roles' && (
          <Button size="sm" variant="secondary" onClick={() => setEditingRole(null)}>
            <Plus className="h-4 w-4" />
            Добавить роль
          </Button>
        )}
        {subview === 'groups' && (
          <Button size="sm" variant="secondary" onClick={() => setEditingGroup(null)}>
            <Plus className="h-4 w-4" />
            Добавить группу
          </Button>
        )}
      </div>

      {subview === 'members' && (
        <Card>
          {membersQuery.isLoading || rolesQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-600)]">
                    <th className="px-4 py-2.5">Пользователь</th>
                    <th className="px-4 py-2.5">Роль</th>
                    <th className="px-4 py-2.5">Группы</th>
                    <th className="px-4 py-2.5">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {pageMembers.map((member) => {
                    const role = roleById.get(member.roleId)
                    return (
                      <tr key={member.id} onClick={() => setEditingMember(member)} className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-canvas)]">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-[var(--color-ink-900)]">{member.name}</p>
                          <p className="text-xs text-[var(--color-ink-400)]">{member.email}</p>
                        </td>
                        <td className="px-4 py-2.5">{role && <Badge color={role.color} bg={role.bg}>{role.name}</Badge>}</td>
                        <td className="px-4 py-2.5 text-xs text-[var(--color-ink-600)]">
                          {member.groupIds.map((id) => groupById.get(id)?.name).filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge color={STATUS_COLOR[member.status].color} bg={STATUS_COLOR[member.status].bg}>
                            {STATUS_LABEL[member.status]}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!membersQuery.isLoading && <Pagination page={page} pageSize={PAGE_SIZE} total={allMembers.length} onPageChange={setPage} />}
        </Card>
      )}

      {subview === 'roles' && (
        <Card>
          {rolesQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {(rolesQuery.data ?? []).map((role) => (
                <button key={role.id} onClick={() => setEditingRole(role)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--color-canvas)]">
                  <div className="flex items-center gap-2.5">
                    <Badge color={role.color} bg={role.bg}>
                      {role.name}
                    </Badge>
                    <span className="text-xs text-[var(--color-ink-400)]">{role.permissions.length} прав</span>
                  </div>
                  <span className="text-xs text-[var(--color-ink-600)]">{memberCountByRole.get(role.id) ?? 0} сотрудников</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {subview === 'groups' && (
        <Card>
          {groupsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {(groupsQuery.data ?? []).map((group) => (
                <button key={group.id} onClick={() => setEditingGroup(group)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--color-canvas)]">
                  <span className="font-medium text-[var(--color-ink-900)]">{group.name}</span>
                  <span className="text-xs text-[var(--color-ink-600)]">{group.memberIds.length} участников</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {editingMember !== undefined && (
        <MemberDrawer member={editingMember} roles={rolesQuery.data ?? []} groups={groupsQuery.data ?? []} onClose={() => setEditingMember(undefined)} />
      )}
      {editingRole !== undefined && (
        <RoleDrawer role={editingRole} memberCount={editingRole ? (memberCountByRole.get(editingRole.id) ?? 0) : 0} onClose={() => setEditingRole(undefined)} />
      )}
      {editingGroup !== undefined && <GroupDrawer group={editingGroup} members={membersQuery.data ?? []} onClose={() => setEditingGroup(undefined)} />}
    </div>
  )
}
