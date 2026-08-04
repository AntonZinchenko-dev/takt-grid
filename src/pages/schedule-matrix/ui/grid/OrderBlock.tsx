import { useRef } from 'react'
import { priorityColorVar, priorityBgVar, type OrderPriority, type OrderStatus } from '@/entities/order'
import type { GridStore, DragGhost } from '../../model/grid-store'
import { cn } from '@/shared/lib/cn'

const DRAG_THRESHOLD_PX = 4

interface OrderBlockProps {
  leftPx: number
  widthPx: number
  topPx: number
  heightPx: number
  code: string
  priority: OrderPriority
  status: OrderStatus
  assignmentId: string
  orderId: string
  rowIndex: number
  hourStart: number
  durationHours: number
  plannedQuantity?: number
  actualQuantity?: number
  defectQuantity?: number
  requiredGroupId: string
  store: GridStore
  getContentPoint: (clientX: number, clientY: number) => { x: number; y: number }
  onCommitDrag: (ghost: DragGhost) => void
  onOpenDetail: (assignmentId: string) => void
  isDraggingOrigin?: boolean
  dimmed?: boolean
  /** Найден через глобальный поиск — коротко обводится кольцом (см. .search-highlight-ring). */
  highlighted?: boolean
}


export function OrderBlock({
  leftPx,
  widthPx,
  topPx,
  heightPx,
  code,
  priority,
  status,
  assignmentId,
  orderId,
  rowIndex,
  hourStart,
  durationHours,
  plannedQuantity,
  actualQuantity,
  defectQuantity,
  requiredGroupId,
  store,
  getContentPoint,
  onCommitDrag,
  onOpenDetail,
  isDraggingOrigin,
  dimmed,
  highlighted,
}: OrderBlockProps) {
  const pointerRef = useRef<{ startClientX: number; startClientY: number; dragging: boolean } | null>(null)

  const done = status === 'done'
  const color = done ? 'var(--color-priority-done)' : priorityColorVar(priority)
  const bg = done ? 'var(--color-priority-done-bg)' : priorityBgVar(priority)
  const showLabel = widthPx >= 46
  const resultPercent = actualQuantity !== undefined && plannedQuantity ? Math.round(Math.min(1, actualQuantity / plannedQuantity) * 100) : null
  const defectPercent =
    defectQuantity !== undefined && plannedQuantity ? Math.round(Math.min(1, defectQuantity / plannedQuantity) * 100) : null

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerRef.current = { startClientX: e.clientX, startClientY: e.clientY, dragging: false }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = pointerRef.current
    if (!state) return
    const dx = e.clientX - state.startClientX
    const dy = e.clientY - state.startClientY

    if (!state.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      state.dragging = true
      const point = getContentPoint(state.startClientX, state.startClientY)
      const grabHour = store.hourIndexAtX(point.x)
      store.startBlockDrag({
        assignmentId,
        orderId,
        orderCode: code,
        priority,
        rowIndex,
        hourStart,
        durationHours,
        grabOffsetHours: grabHour - hourStart,
        requiredGroupId,
      })
    }

    if (state.dragging) {
      const point = getContentPoint(e.clientX, e.clientY)
      store.updateBlockDragTarget(store.rowIndexAtY(point.y), store.hourIndexAtX(point.x))
    }
  }

  const handlePointerUp = () => {
    const state = pointerRef.current
    pointerRef.current = null
    if (state?.dragging) {
      if (store.dragGhost) onCommitDrag(store.dragGhost)
    } else {
      // Обычный клик (без перетаскивания) — открываем карточку деталей заказа
      onOpenDetail(assignmentId)
    }
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title={`${code} · ${status === 'done' ? 'выполнен' : priority}${resultPercent !== null ? ` · результат ${resultPercent}%` : ''}${defectPercent ? ` · брак ${defectPercent}%` : ''}`}
      className={cn(
        'pointer-events-auto absolute cursor-grab touch-none overflow-hidden rounded-md border px-2 text-left text-[11px] font-medium leading-tight transition-[filter,opacity] hover:brightness-95 active:cursor-grabbing',
        done && 'opacity-70',
        isDraggingOrigin && 'opacity-25',
        dimmed && 'opacity-20 saturate-0',
        highlighted && 'search-highlight-ring',
      )}
      style={{
        left: leftPx,
        width: Math.max(widthPx - 2, 3),
        top: topPx,
        height: heightPx,
        borderColor: color,
        color,
      }}
    >
      <span className="absolute inset-0" style={{ backgroundColor: bg }} />
      {resultPercent !== null && resultPercent > 0 && (
        <span className="absolute inset-y-0 left-0 transition-[width]" style={{ width: `${resultPercent}%`, backgroundColor: color, opacity: 0.4 }} />
      )}
      {defectPercent !== null && defectPercent > 0 && (
        <span
          className="absolute inset-y-0 transition-[left,width]"
          style={{ left: `${resultPercent ?? 0}%`, width: `${defectPercent}%`, backgroundColor: 'var(--color-priority-critical)', opacity: 0.6 }}
        />
      )}
      {showLabel && <span className="relative block truncate pt-1">{code}</span>}
    </button>
  )
}
