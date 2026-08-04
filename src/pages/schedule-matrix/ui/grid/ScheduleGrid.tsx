import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { observer } from 'mobx-react-lite'
import type { GridStore, DragGhost } from '../../model/grid-store'
import { TOTAL_HOURS, DAY_MS, HOUR_MS, hourIndexToDate, dateToHourIndex } from '../../lib/timeline'
import { RowLabelCell } from './RowLabelCell'
import { TimeHeaderBand } from './TimeHeaderBand'
import { OrderBlock } from './OrderBlock'
import { DowntimeBlock } from './DowntimeBlock'
import { SelectionOverlay } from './SelectionOverlay'
import { DragGhostOverlay } from './DragGhostOverlay'
import type { OccupancyIndex } from '@/shared/lib/occupancy-index'
import type { ScheduleAssignment } from '@/entities/schedule-assignment'
import { useMoveAssignmentMutation } from '@/entities/schedule-assignment'
import type { Order } from '@/entities/order'
import type { DowntimeRule } from '@/entities/machine'
import type { Product } from '@/entities/product'
import { ApiError } from '@/shared/api'

const LABEL_WIDTH = 224
const ROW_VERTICAL_PADDING = 8

interface ScheduleGridProps {
  store: GridStore
  occupancyIndex: OccupancyIndex
  assignmentsById: Map<string, ScheduleAssignment>
  ordersById: Map<string, Order>
  productsById: Map<string, Product>
  downtimeByMachine: Map<string, DowntimeRule[]>
  onOpenOrderDetail: (assignmentId: string) => void
}

/**
 * Двухосевая виртуализация:
 *  — вертикаль (строки станков) через реальный @tanstack/react-virtual instance;
 *  — горизонталь (часы) НЕ рендерится поячеечно — сетка бесконечна (365×24 часов),
 *    поэтому линии часов рисуются CSS-паттерном (0 DOM-узлов), а блоки заказов/простоев
 *    позиционируются напрямую по timestamp → px и достаются из OccupancyIndex по
 *    видимому диапазону часов (тот же бинарный поиск, что и в drag-валидации).
 * Sticky-шапка и sticky-колонка реализованы через синхронный скролл трёх независимых
 * контейнеров, а не через CSS position:sticky — сознательный выбор ради предсказуемости
 * на вложенных transform/overflow, которых у нас достаточно из-за виртуализации.
 */
export const ScheduleGrid = observer(function ScheduleGrid({
  store,
  occupancyIndex,
  assignmentsById,
  ordersById,
  productsById,
  downtimeByMachine,
  onOpenOrderDetail,
}: ScheduleGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const labelScrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const anchorTimerRef = useRef<number | undefined>(undefined)
  const dropErrorTimerRef = useRef<number | undefined>(undefined)

  const [dropError, setDropError] = useState<string | null>(null)
  const moveMutation = useMoveAssignmentMutation()

  const headerHeight = store.hourWidth >= 8 ? 49 : 28

  const rowVirtualizer = useVirtualizer({
    count: store.flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => store.rowHeight(store.flatRows[i]!),
    overscan: 8,
  })

  const totalWidthPx = TOTAL_HOURS * store.hourWidth
  const totalHeightPx = Math.max(rowVirtualizer.getTotalSize(), 1)

  const recomputeVisibleHour = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const start = Math.max(0, Math.floor(el.scrollLeft / store.hourWidth) - 6)
    const end = Math.min(TOTAL_HOURS, Math.ceil((el.scrollLeft + el.clientWidth) / store.hourWidth) + 6)
    store.setVisibleHourRange(start, end)
  }, [store])

  const scheduleAnchorCheck = useCallback(() => {
    if (anchorTimerRef.current) window.clearTimeout(anchorTimerRef.current)
    anchorTimerRef.current = window.setTimeout(() => {
      const el = scrollRef.current
      if (!el) return
      const centerHour = (el.scrollLeft + el.clientWidth / 2) / store.hourWidth
      const centerDate = hourIndexToDate(store.epochMs, centerHour)
      const diffDays = Math.abs(centerDate.getTime() - store.anchorDate.getTime()) / DAY_MS
      if (diffDays > 4) store.setAnchorDate(centerDate)
    }, 250)
  }, [store])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = el.scrollLeft
    if (labelScrollRef.current) labelScrollRef.current.scrollTop = el.scrollTop
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(recomputeVisibleHour)
    scheduleAnchorCheck()
  }, [recomputeVisibleHour, scheduleAnchorCheck])

  // Начальный скролл к "сегодня"
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nowHour = dateToHourIndex(store.epochMs, new Date())
    el.scrollLeft = Math.max(0, nowHour * store.hourWidth - el.clientWidth * 0.3)
    recomputeVisibleHour()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // При смене зума пересчитываем скролл так, чтобы anchorDate осталась на месте
  const prevZoomRef = useRef(store.zoom)
  useLayoutEffect(() => {
    if (prevZoomRef.current === store.zoom) return
    prevZoomRef.current = store.zoom
    const el = scrollRef.current
    if (!el) return
    const anchorHour = dateToHourIndex(store.epochMs, store.anchorDate)
    el.scrollLeft = Math.max(0, anchorHour * store.hourWidth - el.clientWidth * 0.3)
    recomputeVisibleHour()
  }, [store.zoom, store, recomputeVisibleHour])

  // Явный запрос "прыгнуть" к дате — кнопка "Сегодня" в тулбаре
  const lastScrollTokenRef = useRef(store.scrollRequestToken)
  useLayoutEffect(() => {
    if (store.scrollRequestToken === lastScrollTokenRef.current) return
    lastScrollTokenRef.current = store.scrollRequestToken
    const el = scrollRef.current
    if (!el || !store.pendingScrollDate) return
    const hour = dateToHourIndex(store.epochMs, store.pendingScrollDate)
    el.scrollLeft = Math.max(0, hour * store.hourWidth - el.clientWidth * 0.3)
    recomputeVisibleHour()
  }, [store.scrollRequestToken, store, recomputeVisibleHour])

  // Esc отменяет активный drag-перенос
  useEffect(() => {
    if (!store.dragGhost) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.cancelBlockDrag()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [store, store.dragGhost])

  const showDropError = useCallback((message: string) => {
    setDropError(message)
    if (dropErrorTimerRef.current) window.clearTimeout(dropErrorTimerRef.current)
    dropErrorTimerRef.current = window.setTimeout(() => setDropError(null), 3200)
  }, [])

  const getContentPoint = useCallback((clientX: number, clientY: number) => {
    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handleCommitDrag = useCallback(
    (ghost: DragGhost) => {
      store.cancelBlockDrag()

      const targetRow = store.flatRows[ghost.targetRowIndex]
      if (!targetRow || targetRow.kind !== 'machine') return
      if (ghost.targetRowIndex === ghost.originRowIndex && ghost.targetHourStart === ghost.originHourStart) return

      if (targetRow.machine.groupId !== ghost.requiredGroupId) {
        showDropError(`Станок «${targetRow.machine.name}» не подходит по группе для заказа «${ghost.orderCode}»`)
        return
      }

      const newStartMs = store.epochMs + ghost.targetHourStart * HOUR_MS
      const newEndMs = newStartMs + ghost.durationHours * HOUR_MS

      if (occupancyIndex.hasOverlap(targetRow.machine.id, newStartMs, newEndMs, ghost.assignmentId)) {
        showDropError(`Станок «${targetRow.machine.name}» занят в это время`)
        return
      }

      moveMutation.mutate(
        {
          id: ghost.assignmentId,
          machineId: targetRow.machine.id,
          startAt: new Date(newStartMs).toISOString(),
          endAt: new Date(newEndMs).toISOString(),
        },
        {
          onError: (err) => {
            showDropError(err instanceof ApiError ? err.message : 'Не удалось перенести заказ')
          },
        },
      )
    },
    [store, occupancyIndex, moveMutation, showDropError],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const rowIndex = store.rowIndexAtY(e.clientY - rect.top)
    const row = store.flatRows[rowIndex]
    if (!row || row.kind !== 'machine') {
      store.clearSelection()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    store.startSelection(rowIndex, store.hourIndexAtX(e.clientX - rect.left))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    store.updateSelection(store.rowIndexAtY(e.clientY - rect.top), store.hourIndexAtX(e.clientX - rect.left))
  }

  const handlePointerUp = () => store.endSelection()

  const rangeStartMs = hourIndexToDate(store.epochMs, store.visibleHourStart).getTime()
  const rangeEndMs = hourIndexToDate(store.epochMs, store.visibleHourEnd).getTime()
  const msToPx = (ms: number) => ((ms - store.epochMs) / HOUR_MS) * store.hourWidth

  const gridLineStep = store.hourWidth >= 8 ? store.hourWidth : 24 * store.hourWidth

  const ghost = store.dragGhost
  let ghostView: { label: string; leftPx: number; topPx: number; widthPx: number; heightPx: number; isValid: boolean } | null = null
  if (ghost) {
    const targetRow = store.flatRows[ghost.targetRowIndex]
    const rowTop = store.rowOffsets[ghost.targetRowIndex] ?? 0
    const rowHeight = targetRow ? store.rowHeight(targetRow) : 56
    const targetStartMs = store.epochMs + ghost.targetHourStart * HOUR_MS
    const targetEndMs = targetStartMs + ghost.durationHours * HOUR_MS
    const isValid = Boolean(
      targetRow &&
        targetRow.kind === 'machine' &&
        targetRow.machine.groupId === ghost.requiredGroupId &&
        !occupancyIndex.hasOverlap(targetRow.machine.id, targetStartMs, targetEndMs, ghost.assignmentId),
    )
    ghostView = {
      label: ghost.orderCode,
      leftPx: ghost.targetHourStart * store.hourWidth,
      topPx: rowTop + ROW_VERTICAL_PADDING,
      widthPx: ghost.durationHours * store.hourWidth,
      heightPx: rowHeight - ROW_VERTICAL_PADDING * 2,
      isValid,
    }
  }

  const preview = store.previewGhost
  let previewView: { label: string; leftPx: number; topPx: number; widthPx: number; heightPx: number; isValid: boolean } | null = null
  if (preview) {
    const rowTop = store.rowOffsets[preview.rowIndex] ?? 0
    const row = store.flatRows[preview.rowIndex]
    const rowHeight = row ? store.rowHeight(row) : 56
    const startMs = store.epochMs + preview.hourStart * HOUR_MS
    const endMs = startMs + preview.durationHours * HOUR_MS
    const isValid = !occupancyIndex.hasOverlap(preview.machineId, startMs, endMs)
    previewView = {
      label: preview.label,
      leftPx: preview.hourStart * store.hourWidth,
      topPx: rowTop + ROW_VERTICAL_PADDING,
      widthPx: preview.durationHours * store.hourWidth,
      heightPx: rowHeight - ROW_VERTICAL_PADDING * 2,
      isValid,
    }
  }

  return (
    <div className="relative flex-1 overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      {dropError && (
        <div className="absolute right-4 top-3 z-40 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-md">
          {dropError}
        </div>
      )}

      {/* Угловая ячейка */}
      <div
        className="absolute left-0 top-0 z-30 flex items-center border-b border-r border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-xs font-semibold text-[var(--color-ink-600)]"
        style={{ width: LABEL_WIDTH, height: headerHeight }}
      >
        Станки / Линии
      </div>

      {/* Временной хедер — скроллится только горизонтально, синхронно с телом */}
      <div ref={headerScrollRef} className="absolute right-0 top-0 z-20 overflow-hidden" style={{ left: LABEL_WIDTH, height: headerHeight }}>
        <div style={{ width: totalWidthPx, height: headerHeight }}>
          <TimeHeaderBand epochMs={store.epochMs} hourWidth={store.hourWidth} visibleStartHour={store.visibleHourStart} visibleEndHour={store.visibleHourEnd} />
        </div>
      </div>

      {/* Колонка станков — скроллится только вертикально, синхронно с телом */}
      <div
        ref={labelScrollRef}
        className="absolute bottom-0 left-0 z-20 overflow-hidden border-r border-[var(--color-border)]"
        style={{ width: LABEL_WIDTH, top: headerHeight }}
      >
        <div style={{ width: LABEL_WIDTH, height: totalHeightPx, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const row = store.flatRows[vRow.index]
            if (!row) return null
            return (
              <RowLabelCell
                key={vRow.key}
                row={row}
                top={vRow.start}
                height={vRow.size}
                collapsed={row.kind === 'workshop' ? store.collapsedWorkshopIds.has(row.workshop.id) : undefined}
                onToggleWorkshop={store.toggleWorkshop}
              />
            )
          })}
        </div>
      </div>

      {/* Тело — единственный реальный scroll-контейнер обеих осей */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute bottom-0 right-0 overflow-auto scrollbar-thin"
        style={{ left: LABEL_WIDTH, top: headerHeight }}
      >
        <div ref={contentRef} style={{ width: totalWidthPx, height: totalHeightPx, position: 'relative' }}>
          {/* Слой выделения — ловит pointer-события и рисует часовые линии фоном */}
          <div
            className="absolute inset-0"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              backgroundImage: `repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 1px, transparent 1px, transparent ${gridLineStep}px)`,
            }}
          />

          {/* Строки: фон + блоки заказов/простоев. pointer-events отключены на подложке ряда,
              чтобы клики на пустом месте проваливались к слою выделения ниже. pointer-events
              наследуется, поэтому сами блоки (OrderBlock/DowntimeBlock) явно возвращают auto —
              иначе они тоже стали бы некликабельными. */}
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const row = store.flatRows[vRow.index]
            if (!row) return null

            if (row.kind === 'workshop') {
              return (
                <div
                  key={vRow.key}
                  className="pointer-events-none absolute left-0 w-full border-b border-[var(--color-border)] bg-[var(--color-canvas)]/70"
                  style={{ top: vRow.start, height: vRow.size }}
                />
              )
            }

            const machine = row.machine
            const overlapping = occupancyIndex.findOverlapping(machine.id, rangeStartMs, rangeEndMs)
            const downtimeRules = (downtimeByMachine.get(machine.id) ?? []).filter(
              (r) => new Date(r.startAt).getTime() < rangeEndMs && new Date(r.endAt).getTime() > rangeStartMs,
            )
            const groupMismatch = Boolean(ghost && machine.groupId !== ghost.requiredGroupId)

            return (
              <div
                key={vRow.key}
                className="pointer-events-none absolute left-0 w-full border-b border-[var(--color-border)]"
                style={{
                  top: vRow.start,
                  height: vRow.size,
                  backgroundImage: groupMismatch
                    ? 'repeating-linear-gradient(135deg, rgba(185, 28, 28, 0.07) 0, rgba(185, 28, 28, 0.07) 6px, transparent 6px, transparent 12px)'
                    : undefined,
                }}
              >
                {downtimeRules.map((rule) => {
                  const left = msToPx(new Date(rule.startAt).getTime())
                  const width = msToPx(new Date(rule.endAt).getTime()) - left
                  return (
                    <DowntimeBlock key={rule.id} leftPx={left} widthPx={width} topPx={ROW_VERTICAL_PADDING} heightPx={vRow.size - ROW_VERTICAL_PADDING * 2} reason={rule.reason} />
                  )
                })}

                {overlapping.map((interval) => {
                  const assignment = assignmentsById.get(interval.id)
                  const order = assignment ? ordersById.get(assignment.orderId) : undefined
                  const product = order ? productsById.get(order.productId) : undefined
                  const left = msToPx(interval.start)
                  const width = msToPx(interval.end) - left
                  const blockHourStart = Math.round((interval.start - store.epochMs) / HOUR_MS)
                  const blockDurationHours = Math.round((interval.end - interval.start) / HOUR_MS)
                  const matchesFilter =
                    (!store.filters.status || order?.status === store.filters.status) && (!store.filters.priority || order?.priority === store.filters.priority)

                  return (
                    <OrderBlock
                      key={interval.id}
                      leftPx={left}
                      widthPx={width}
                      topPx={ROW_VERTICAL_PADDING}
                      heightPx={vRow.size - ROW_VERTICAL_PADDING * 2}
                      code={order?.code ?? '…'}
                      priority={order?.priority ?? 'normal'}
                      status={order?.status ?? 'planned'}
                      plannedQuantity={assignment?.plannedQuantity}
                      actualQuantity={assignment?.actualQuantity}
                      defectQuantity={assignment?.defectQuantity}
                      requiredGroupId={product?.techMap.machineGroupId ?? ''}
                      assignmentId={interval.id}
                      orderId={assignment?.orderId ?? ''}
                      rowIndex={vRow.index}
                      hourStart={blockHourStart}
                      durationHours={blockDurationHours}
                      store={store}
                      getContentPoint={getContentPoint}
                      onCommitDrag={handleCommitDrag}
                      onOpenDetail={onOpenOrderDetail}
                      isDraggingOrigin={ghost?.assignmentId === interval.id}
                      dimmed={!matchesFilter}
                    />
                  )
                })}
              </div>
            )
          })}

          {store.selection && <SelectionOverlay selection={store.selection} rowOffsets={store.rowOffsets} hourWidth={store.hourWidth} />}
          {ghostView && <DragGhostOverlay {...ghostView} />}
          {!ghost && previewView && <DragGhostOverlay {...previewView} />}
        </div>
      </div>
    </div>
  )
})
