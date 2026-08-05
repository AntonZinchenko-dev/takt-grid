import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Loader2 } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { useAuthStore } from '@/entities/session'
import { useWorkshopsQuery } from '@/entities/workshop'
import type { Workshop } from '@/entities/workshop'
import { useMachinesQuery } from '@/entities/machine'
import type { Machine } from '@/entities/machine'
import { GridStore } from '../model/grid-store'
import { UndoStore } from '../model/undo-store'
import { usePresenceChannel } from '../model/use-presence-channel'
import { useScheduleData } from '../model/use-schedule-data'
import { PresenceBar } from './PresenceBar'
import { AutoScheduleDrawer } from './AutoScheduleDrawer'
import { WhatIfDrawer } from './WhatIfDrawer'
import type { ZoomLevel } from '../lib/timeline'
import { Toolbar } from './Toolbar'
import { ScheduleGrid } from './grid/ScheduleGrid'
import { SelectionPanel } from './SelectionPanel'
import { BulkEditPanel } from './BulkEditPanel'
import { OrderWizard } from './wizard/OrderWizard'
import { ReassignOrderWizard } from './wizard/ReassignOrderWizard'
import { OrderDetailDrawer } from './OrderDetailDrawer'
import { ShiftExportDrawer } from './ShiftExportDrawer'
import { useToastStore } from '@/shared/lib/toast-store'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
}

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
  // Начальный масштаб матрицы — из "Рабочих предпочтений" профиля; читаем один раз при монтировании,
  // дальнейшие переключения зума пользователем в сторе живут независимо.
  const defaultZoomRef = useRef(useAuthStore.getState().preferences.defaultZoom)
  const [store] = useState(() => new GridStore(workshops, machines, new Date(), defaultZoomRef.current))
  const [undoStore] = useState(() => new UndoStore())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null)
  const [conflictResolve, setConflictResolve] = useState<{ reason?: string } | null>(null)
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null)
  const [shiftExportOpen, setShiftExportOpen] = useState(false)
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false)
  const [whatIfOpen, setWhatIfOpen] = useState(false)
  const data = useScheduleData(store.anchorDate)
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

  const pushToast = useToastStore((s) => s.push)
  const presence = usePresenceChannel(store)

  // Ctrl+Z / Ctrl+Shift+Z — undo/redo действий матрицы. Игнорируем в полях ввода, где
  // Ctrl+Z должен работать как обычная отмена текста, а не откатывать перенос заказа.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || isEditableTarget(e.target)) return
      e.preventDefault()
      if (e.shiftKey) {
        undoStore.redo().then((label) => label && pushToast(`Повторено: ${label}`, 'info'))
      } else {
        undoStore.undo().then((label) => label && pushToast(`Отменено: ${label}`, 'info'))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoStore, pushToast])

  /**
   * Все одноразовые deep-link входы (дашборд/поиск/уведомления/командная палитра/AI-помощник/
   * конфликты/реестр заказов) — через query-параметры, а не location.state. state навсегда
   * прилипает к конкретной записи истории браузера и переживает обновление страницы (F5),
   * а компонентный ref, которым раньше отмечали "уже обработано", при реальном reload создаётся
   * заново и ничего не помнит — в паре они гарантированно проигрывали действие повторно после
   * каждого F5 (это и был "старый баг"). Параметры вычищаем из URL сразу после применения —
   * ровно поэтому reload на уже очищенном URL ничего не повторяет.
   */
  useEffect(() => {
    const jumpToIso = searchParams.get('jump')
    const zoom = searchParams.get('zoom') as ZoomLevel | null
    const openWizardFlag = searchParams.get('openWizard')
    const resolveAssignmentId = searchParams.get('resolve')
    const reason = searchParams.get('reason')
    const assignOrderId = searchParams.get('assignOrder')
    const highlightOrderId = searchParams.get('highlightOrder')

    if (!jumpToIso && !zoom && !openWizardFlag && !resolveAssignmentId && !assignOrderId && !highlightOrderId) return

    if (zoom) store.setZoom(zoom)
    if (openWizardFlag) setWizardOpen(true)
    if (assignOrderId) setReassignOrderId(assignOrderId)

    if (resolveAssignmentId) {
      if (jumpToIso) store.jumpToDate(new Date(jumpToIso))
      setOpenAssignmentId(resolveAssignmentId)
      setConflictResolve({ reason: reason ?? undefined })
      store.setHighlightedAssignment(resolveAssignmentId)
      window.setTimeout(() => store.setHighlightedAssignment(null), 2500)
    }

    // Уточняем дату до реального назначения (грубый jumpToIso — это дедлайн, не факт расписания).
    // Пока окно назначений для нужной даты не подгрузилось, оставляем highlightOrder/jump в URL
    // и тихо ждём следующего рендера — эффект перезапустится сам, когда data подъедут.
    let highlightOrderHandled = false
    if (highlightOrderId) {
      const assignment = data.assignmentByOrderId.get(highlightOrderId)
      if (assignment) {
        store.jumpToDate(new Date(assignment.startAt))
        setConflictResolve(null)
        setOpenAssignmentId(assignment.id)
        store.setHighlightedAssignment(assignment.id, assignment.machineId)
        window.setTimeout(() => store.setHighlightedAssignment(null), 2500)
        highlightOrderHandled = true
      } else if (jumpToIso) {
        store.jumpToDate(new Date(jumpToIso))
      }
    } else if (jumpToIso && !resolveAssignmentId) {
      store.jumpToDate(new Date(jumpToIso))
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('zoom')
        next.delete('openWizard')
        next.delete('assignOrder')
        next.delete('resolve')
        next.delete('reason')
        if (!highlightOrderId || highlightOrderHandled) {
          next.delete('highlightOrder')
          next.delete('jump')
        }
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, data.assignmentByOrderId])

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <Toolbar
        store={store}
        undoStore={undoStore}
        workshops={workshops}
        onCreateOrder={() => setWizardOpen(true)}
        onExportShift={() => setShiftExportOpen(true)}
        onAutoSchedule={() => setAutoScheduleOpen(true)}
        onWhatIf={() => setWhatIfOpen(true)}
      />
      <PresenceBar selfName={presence.selfName} peers={presence.peers} />
      <ScheduleGrid
        store={store}
        undoStore={undoStore}
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
        undoStore={undoStore}
        occupancyIndex={data.occupancyIndex}
        assignmentsById={data.assignmentsById}
        ordersById={data.ordersById}
        onOpenBulkEdit={() => setBulkEditOpen(true)}
      />
      {bulkEditOpen && (
        <BulkEditPanel
          store={store}
          undoStore={undoStore}
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
      {autoScheduleOpen && (
        <AutoScheduleDrawer store={store} undoStore={undoStore} machines={machines} downtimeByMachine={data.downtimeByMachine} onClose={() => setAutoScheduleOpen(false)} />
      )}
      {whatIfOpen && (
        <WhatIfDrawer store={store} machines={machines} products={data.products} downtimeByMachine={data.downtimeByMachine} onClose={() => setWhatIfOpen(false)} />
      )}
    </main>
  )
})
