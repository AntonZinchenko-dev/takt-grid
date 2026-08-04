import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, Plus } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Pagination } from '@/shared/ui/Pagination'
import { useMachinesQuery, useDowntimeRulesQuery } from '@/entities/machine'
import type { Machine } from '@/entities/machine'
import { useWorkshopsQuery } from '@/entities/workshop'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { RANGE_START_DAYS, RANGE_END_DAYS } from '@/shared/lib/schedule-window'
import { MachineDetailDrawer } from './MachineDetailDrawer'
import { CreateMachineDrawer } from './CreateMachineDrawer'
import type { MachineGroupOption } from '../model/types'

const STATUS_LABEL: Record<Machine['status'], string> = { running: 'Работает', idle: 'Простой', down: 'Авария' }
const STATUS_COLOR: Record<Machine['status'], string> = { running: '#16a34a', idle: '#eab308', down: '#dc2626' }
const DAY_MS = 86_400_000
const PAGE_SIZE = 20

export function MachinesPage() {
  const machinesQuery = useMachinesQuery()
  const workshopsQuery = useWorkshopsQuery()
  const downtimeQuery = useDowntimeRulesQuery()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [page, setPage] = useState(1)
  const location = useLocation()

  // Переход из глобального поиска в шапке — сразу открыть карточку станка
  useEffect(() => {
    const state = location.state as { openMachineId?: string } | null
    if (state?.openMachineId) setSelectedId(state.openMachineId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const from = useMemo(() => new Date(Date.now() + RANGE_START_DAYS * DAY_MS).toISOString(), [])
  const to = useMemo(() => new Date(Date.now() + RANGE_END_DAYS * DAY_MS).toISOString(), [])
  const assignmentsQuery = useAssignmentsWindowQuery(from, to)

  const workshopNameById = useMemo(() => new Map((workshopsQuery.data ?? []).map((w) => [w.id, w.name])), [workshopsQuery.data])

  const groupOptions = useMemo<MachineGroupOption[]>(() => {
    const map = new Map<string, MachineGroupOption>()
    for (const m of machinesQuery.data ?? []) {
      const key = `${m.groupId}|${m.workshopId}`
      if (!map.has(key)) map.set(key, { groupId: m.groupId, groupName: m.groupName, workshopId: m.workshopId, workshopName: workshopNameById.get(m.workshopId) ?? '—' })
    }
    return [...map.values()].sort((a, b) => a.groupName.localeCompare(b.groupName, 'ru'))
  }, [machinesQuery.data, workshopNameById])

  const selectedMachine = machinesQuery.data?.find((m) => m.id === selectedId) ?? null
  const selectedDowntime = (downtimeQuery.data ?? []).filter((r) => r.machineId === selectedId)
  const selectedAssignedCount = (assignmentsQuery.data ?? []).filter((a) => a.machineId === selectedId).length

  const allMachines = machinesQuery.data ?? []
  const pageMachines = allMachines.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
      <TopHeader
        title="Станки и оборудование"
        subtitle="Парк оборудования, статусы, история простоев"
        actions={
          <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            Добавить станок
          </Button>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          {machinesQuery.isLoading || workshopsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-600)]">
                    <th className="px-4 py-2.5">Станок</th>
                    <th className="px-4 py-2.5">Цех</th>
                    <th className="px-4 py-2.5">Группа</th>
                    <th className="px-4 py-2.5">Статус</th>
                    <th className="px-4 py-2.5 text-right">Производительность</th>
                  </tr>
                </thead>
                <tbody>
                  {pageMachines.map((machine) => (
                    <tr
                      key={machine.id}
                      onClick={() => setSelectedId(machine.id)}
                      className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-canvas)]"
                    >
                      <td className="px-4 py-2.5 font-medium text-[var(--color-ink-900)]">{machine.name}</td>
                      <td className="px-4 py-2.5 text-[var(--color-ink-600)]">{workshopNameById.get(machine.workshopId) ?? '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--color-ink-600)]">{machine.groupName}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-[var(--color-ink-600)]">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[machine.status] }} />
                          {STATUS_LABEL[machine.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">{machine.capacityPerHour} шт/ч</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!machinesQuery.isLoading && <Pagination page={page} pageSize={PAGE_SIZE} total={allMachines.length} onPageChange={setPage} />}
        </Card>
      </main>

      {selectedMachine && (
        <MachineDetailDrawer
          machine={selectedMachine}
          workshopName={workshopNameById.get(selectedMachine.workshopId) ?? '—'}
          downtimeRules={selectedDowntime}
          groupOptions={groupOptions}
          assignedOrdersCount={selectedAssignedCount}
          onClose={() => setSelectedId(null)}
        />
      )}

      {creating && <CreateMachineDrawer groupOptions={groupOptions} onClose={() => setCreating(false)} />}
    </>
  )
}
