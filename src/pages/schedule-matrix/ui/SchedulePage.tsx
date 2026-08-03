import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Loader2 } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { useWorkshopsQuery } from '@/entities/workshop'
import type { Workshop } from '@/entities/workshop'
import { useMachinesQuery } from '@/entities/machine'
import type { Machine } from '@/entities/machine'
import { GridStore } from '../model/grid-store'
import { useScheduleData } from '../model/use-schedule-data'
import { Toolbar } from './Toolbar'
import { ScheduleGrid } from './grid/ScheduleGrid'
import { SelectionPanel } from './SelectionPanel'
import { BulkEditPanel } from './BulkEditPanel'
import { OrderWizard } from './wizard/OrderWizard'

export function SchedulePage() {
  const workshopsQuery = useWorkshopsQuery()
  const machinesQuery = useMachinesQuery()
  const ready = Boolean(workshopsQuery.data && machinesQuery.data)

  return (
    <>
      <TopHeader title="Матрица планирования" subtitle="Планируйте загрузку станков и выполняйте заказы" />
      {ready ? (
        <ScheduleMatrixLoaded workshops={workshopsQuery.data!} machines={machinesQuery.data!} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[var(--color-ink-400)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
    </>
  )
}

const ScheduleMatrixLoaded = observer(function ScheduleMatrixLoaded({ workshops, machines }: { workshops: Workshop[]; machines: Machine[] }) {
  const [store] = useState(() => new GridStore(workshops, machines))
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const data = useScheduleData(store.anchorDate)
  const location = useLocation()

  // Переход из "Конфликтов"/"Дашборда" сразу к нужному моменту в матрице
  useEffect(() => {
    const state = location.state as { jumpToIso?: string } | null
    if (state?.jumpToIso) store.jumpToDate(new Date(state.jumpToIso))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Toolbar store={store} workshops={workshops} onCreateOrder={() => setWizardOpen(true)} />
      <ScheduleGrid
        store={store}
        occupancyIndex={data.occupancyIndex}
        assignmentsById={data.assignmentsById}
        ordersById={data.ordersById}
        downtimeByMachine={data.downtimeByMachine}
      />
      <SelectionPanel
        store={store}
        occupancyIndex={data.occupancyIndex}
        assignmentsById={data.assignmentsById}
        ordersById={data.ordersById}
        onOpenBulkEdit={() => setBulkEditOpen(true)}
      />
      {bulkEditOpen && (
        <BulkEditPanel
          store={store}
          occupancyIndex={data.occupancyIndex}
          assignmentsById={data.assignmentsById}
          ordersById={data.ordersById}
          productsById={data.productsById}
          onClose={() => setBulkEditOpen(false)}
        />
      )}
      {wizardOpen && <OrderWizard store={store} products={data.products} machines={machines} onClose={() => setWizardOpen(false)} />}
    </div>
  )
})
