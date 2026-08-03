import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { Card } from '@/shared/ui/Card'
import { useMachinesQuery, useDowntimeRulesQuery } from '@/entities/machine'
import type { Machine } from '@/entities/machine'
import { useWorkshopsQuery } from '@/entities/workshop'
import { MachineDetailDrawer } from './MachineDetailDrawer'

const STATUS_LABEL: Record<Machine['status'], string> = { running: 'Работает', idle: 'Простой', down: 'Авария' }
const STATUS_COLOR: Record<Machine['status'], string> = { running: '#16a34a', idle: '#eab308', down: '#dc2626' }

export function MachinesPage() {
  const machinesQuery = useMachinesQuery()
  const workshopsQuery = useWorkshopsQuery()
  const downtimeQuery = useDowntimeRulesQuery()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const workshopNameById = useMemo(() => new Map((workshopsQuery.data ?? []).map((w) => [w.id, w.name])), [workshopsQuery.data])

  const selectedMachine = machinesQuery.data?.find((m) => m.id === selectedId) ?? null
  const selectedDowntime = (downtimeQuery.data ?? []).filter((r) => r.machineId === selectedId)

  return (
    <>
      <TopHeader title="Станки и оборудование" subtitle="Парк оборудования, статусы, история простоев" />
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
                  {(machinesQuery.data ?? []).map((machine) => (
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
        </Card>
      </main>

      {selectedMachine && (
        <MachineDetailDrawer
          machine={selectedMachine}
          workshopName={workshopNameById.get(selectedMachine.workshopId) ?? '—'}
          downtimeRules={selectedDowntime}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  )
}
