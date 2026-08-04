import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Loader2 } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { useWorkshopsQuery } from '@/entities/workshop'
import type { Workshop } from '@/entities/workshop'
import { useMachinesQuery } from '@/entities/machine'
import type { Machine } from '@/entities/machine'
import { GridStore } from '../model/grid-store'
import { useScheduleData } from '../model/use-schedule-data'
import type { ZoomLevel } from '../lib/timeline'
import { Toolbar } from './Toolbar'
import { ScheduleGrid } from './grid/ScheduleGrid'
import { SelectionPanel } from './SelectionPanel'
import { BulkEditPanel } from './BulkEditPanel'
import { OrderWizard } from './wizard/OrderWizard'
import { ReassignOrderWizard } from './wizard/ReassignOrderWizard'
import { OrderDetailDrawer } from './OrderDetailDrawer'
import { ShiftExportDrawer } from './ShiftExportDrawer'

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
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null)
  const [conflictResolve, setConflictResolve] = useState<{ reason?: string } | null>(null)
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null)
  const [shiftExportOpen, setShiftExportOpen] = useState(false)
  const data = useScheduleData(store.anchorDate)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const closeDetailDrawer = () => {
    setOpenAssignmentId(null)
    setConflictResolve(null)
  }

  const workshopsById = new Map(workshops.map((w) => [w.id, w]))
  const machinesById = new Map(machines.map((m) => [m.id, m]))
  const openAssignment = openAssignmentId ? data.assignmentsById.get(openAssignmentId) : undefined
  const openOrder = openAssignment ? data.ordersById.get(openAssignment.orderId) : undefined
  const openMachine = openAssignment ? machinesById.get(openAssignment.machineId) : undefined
  const openWorkshop = openMachine ? workshopsById.get(openMachine.workshopId) : undefined
  const reassignOrder = reassignOrderId ? data.ordersById.get(reassignOrderId) : undefined

  // Переход из "Дашборда"/поиска сразу к нужному моменту в матрице.
  // Зависим от location.key (не []): navigate() к тому же /matrix даёт новый key,
  // так что переход срабатывает и если пользователь уже был на этой странице.
  useEffect(() => {
    const state = location.state as { jumpToIso?: string; zoom?: ZoomLevel } | null
    if (state?.jumpToIso) store.jumpToDate(new Date(state.jumpToIso))
    if (state?.zoom) store.setZoom(state.zoom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // Переход из "Конфликтов" — через query-параметры, не через location.state: state навсегда
  // прилипает к конкретной записи истории, так что при возврате на неё (кнопка "назад")
  // конфликт открывался бы заново, даже если он давно решён. Параметры вычищаем из URL
  // сразу после прочтения — они одноразовые.
  useEffect(() => {
    const resolveAssignmentId = searchParams.get('resolve')
    if (!resolveAssignmentId) return
    const jumpToIso = searchParams.get('jump')
    const reason = searchParams.get('reason')
    if (jumpToIso) store.jumpToDate(new Date(jumpToIso))
    setOpenAssignmentId(resolveAssignmentId)
    setConflictResolve({ reason: reason ?? undefined })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('resolve')
        next.delete('jump')
        next.delete('reason')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Переход из реестра заказов/дашборда для заказа, снятого с графика — открыть мини-мастер переназначения.
  useEffect(() => {
    const orderId = searchParams.get('assignOrder')
    if (!orderId) return
    setReassignOrderId(orderId)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('assignOrder')
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <Toolbar store={store} workshops={workshops} onCreateOrder={() => setWizardOpen(true)} onExportShift={() => setShiftExportOpen(true)} />
      <ScheduleGrid
        store={store}
        occupancyIndex={data.occupancyIndex}
        assignmentsById={data.assignmentsById}
        ordersById={data.ordersById}
        productsById={data.productsById}
        downtimeByMachine={data.downtimeByMachine}
        onOpenOrderDetail={(id) => {
          setConflictResolve(null)
          setOpenAssignmentId(id)
        }}
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
      {wizardOpen && (
        <OrderWizard store={store} products={data.products} machines={machines} downtimeByMachine={data.downtimeByMachine} onClose={() => setWizardOpen(false)} />
      )}
      {openAssignment && openOrder && openMachine && (
        <OrderDetailDrawer
          store={store}
          order={openOrder}
          assignment={openAssignment}
          machine={openMachine}
          workshopName={openWorkshop?.name ?? '—'}
          machines={machines}
          products={data.products}
          downtimeByMachine={data.downtimeByMachine}
          autoResolve={Boolean(conflictResolve)}
          conflictReason={conflictResolve?.reason}
          onClose={closeDetailDrawer}
        />
      )}
      {reassignOrder && (
        <ReassignOrderWizard
          store={store}
          order={reassignOrder}
          products={data.products}
          machines={machines}
          downtimeByMachine={data.downtimeByMachine}
          onClose={() => setReassignOrderId(null)}
        />
      )}
      {shiftExportOpen && (
        <ShiftExportDrawer
          machines={machines}
          workshops={workshops}
          ordersById={data.ordersById}
          downtimeByMachine={data.downtimeByMachine}
          defaultDate={store.anchorDate}
          onClose={() => setShiftExportOpen(false)}
        />
      )}
    </main>
  )
})
