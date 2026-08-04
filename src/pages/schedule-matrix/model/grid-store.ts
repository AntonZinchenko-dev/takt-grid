import { makeAutoObservable } from 'mobx'
import type { Machine } from '@/entities/machine'
import type { Workshop } from '@/entities/workshop'
import type { OrderPriority, OrderStatus } from '@/entities/order'
import { computeEpoch, HOUR_MS, ZOOM_HOUR_WIDTH, type ZoomLevel } from '../lib/timeline'

export type FlatRow = { kind: 'workshop'; workshop: Workshop } | { kind: 'machine'; machine: Machine }

export interface SelectionRange {
  rowStart: number
  rowEnd: number
  hourStart: number
  hourEnd: number
}

export interface PreviewGhost {
  label: string
  machineId: string
  rowIndex: number
  hourStart: number
  durationHours: number
}

export interface DragGhost {
  assignmentId: string
  orderId: string
  orderCode: string
  priority: OrderPriority
  originRowIndex: number
  originHourStart: number
  durationHours: number
  targetRowIndex: number
  targetHourStart: number
  /** Часовое смещение от левого края блока до точки, за которую его "схватили" — чтобы блок не прыгал под курсор левым краем. */
  grabOffsetHours: number
  /** Группа станков, требуемая техкартой продукта заказа — перенос на станок другой группы запрещён. */
  requiredGroupId: string
}

export interface GridFilters {
  workshopId: string | null
  status: OrderStatus | null
  priority: OrderPriority | null
}

/**
 * Ядро матрицы. Сознательно НЕ держит здесь данные назначений (assignments) —
 * они остаются в react-query кэше (см. ТЗ п.1.3: MobX — для UI-состояния
 * грида с точечной реактивностью, react-query — источник правды по данным).
 * Стор владеет только тем, что должно перерисовывать ровно затронутые ячейки:
 * зум, свёрнутые группы, диапазон выделения.
 */
export class GridStore {
  readonly epochMs: number
  zoom: ZoomLevel = 'day'
  collapsedWorkshopIds = new Set<string>()
  selection: SelectionRange | null = null
  anchorDate: Date
  dragGhost: DragGhost | null = null
  previewGhost: PreviewGhost | null = null
  /** Назначение, найденное через глобальный поиск — кратковременно подсвечивается в гриде (см. SchedulePage). */
  highlightedAssignmentId: string | null = null
  filters: GridFilters = { workshopId: null, status: null, priority: null }
  visibleHourStart = 0
  visibleHourEnd = 120

  private workshops: Workshop[]
  private machines: Machine[]
  private selecting = false
  private selectionAnchor: { row: number; hour: number } | null = null

  constructor(workshops: Workshop[], machines: Machine[], now: Date = new Date()) {
    this.workshops = workshops
    this.machines = machines
    this.epochMs = computeEpoch(now)
    this.anchorDate = now
    makeAutoObservable(this, { epochMs: false }, { autoBind: true })
  }

  get hourWidth(): number {
    return ZOOM_HOUR_WIDTH[this.zoom]
  }

  setZoom(zoom: ZoomLevel): void {
    this.zoom = zoom
  }

  setAnchorDate(date: Date): void {
    this.anchorDate = date
  }

  /** machineId — чтобы развернуть цех, если он свёрнут (иначе строка станка не попадёт в flatRows и подсветить будет нечего). */
  setHighlightedAssignment(assignmentId: string | null, machineId?: string): void {
    this.highlightedAssignmentId = assignmentId
    if (!assignmentId || !machineId) return
    const machine = this.machines.find((m) => m.id === machineId)
    if (machine && this.collapsedWorkshopIds.has(machine.workshopId)) {
      this.collapsedWorkshopIds.delete(machine.workshopId)
    }
  }

  scrollRequestToken = 0
  pendingScrollDate: Date | null = null

  /** В отличие от setAnchorDate (которым дёргает скролл-хендлер сам грид), это явный запрос "прыгнуть" к дате. */
  jumpToDate(date: Date): void {
    this.anchorDate = date
    this.pendingScrollDate = date
    this.scrollRequestToken += 1
  }

  toggleWorkshop(workshopId: string): void {
    if (this.collapsedWorkshopIds.has(workshopId)) this.collapsedWorkshopIds.delete(workshopId)
    else this.collapsedWorkshopIds.add(workshopId)
  }

  get flatRows(): FlatRow[] {
    const rows: FlatRow[] = []
    for (const workshop of this.workshops) {
      if (this.filters.workshopId && workshop.id !== this.filters.workshopId) continue
      rows.push({ kind: 'workshop', workshop })
      if (!this.collapsedWorkshopIds.has(workshop.id)) {
        const machines = this.machines.filter((m) => m.workshopId === workshop.id).sort((a, b) => a.order - b.order)
        for (const machine of machines) rows.push({ kind: 'machine', machine })
      }
    }
    return rows
  }

  setWorkshopFilter(workshopId: string | null): void {
    this.filters = { ...this.filters, workshopId }
  }

  setStatusFilter(status: OrderStatus | null): void {
    this.filters = { ...this.filters, status }
  }

  setPriorityFilter(priority: OrderPriority | null): void {
    this.filters = { ...this.filters, priority }
  }

  setVisibleHourRange(start: number, end: number): void {
    this.visibleHourStart = start
    this.visibleHourEnd = end
  }

  rowHeight(row: FlatRow): number {
    return row.kind === 'workshop' ? 40 : 56
  }

  /** Кумулятивные пиксельные оффсеты строк — источник правды и для virtualizer.estimateSize, и для hit-testing мыши. */
  get rowOffsets(): number[] {
    const offsets: number[] = [0]
    for (const row of this.flatRows) offsets.push(offsets[offsets.length - 1]! + this.rowHeight(row))
    return offsets
  }

  get totalRowsHeight(): number {
    const offsets = this.rowOffsets
    return offsets[offsets.length - 1] ?? 0
  }

  /** Бинарный поиск строки по Y-координате в content-пространстве. */
  rowIndexAtY(y: number): number {
    const offsets = this.rowOffsets
    const lastIndex = offsets.length - 2
    if (lastIndex < 0) return 0
    if (y <= 0) return 0
    if (y >= this.totalRowsHeight) return lastIndex
    let lo = 0
    let hi = lastIndex
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1
      if (offsets[mid]! <= y) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  hourIndexAtX(x: number): number {
    return Math.floor(x / this.hourWidth)
  }

  // ---- Выделение диапазона (mousedown → mousemove → mouseup по content-координатам) ----

  startSelection(rowIndex: number, hourIndex: number): void {
    this.selecting = true
    this.selectionAnchor = { row: rowIndex, hour: hourIndex }
    this.selection = { rowStart: rowIndex, rowEnd: rowIndex, hourStart: hourIndex, hourEnd: hourIndex + 1 }
  }

  updateSelection(rowIndex: number, hourIndex: number): void {
    if (!this.selecting || !this.selectionAnchor) return
    const anchor = this.selectionAnchor
    this.selection = {
      rowStart: Math.min(anchor.row, rowIndex),
      rowEnd: Math.max(anchor.row, rowIndex),
      hourStart: Math.min(anchor.hour, hourIndex),
      hourEnd: Math.max(anchor.hour, hourIndex) + 1,
    }
  }

  endSelection(): void {
    this.selecting = false
    // Пустое/однокликовое выделение не показываем как диапазон
    if (this.selection && this.selection.rowStart === this.selection.rowEnd && this.selection.hourEnd - this.selection.hourStart <= 1) {
      this.selection = null
    }
  }

  clearSelection(): void {
    this.selecting = false
    this.selection = null
  }

  // ---- Drag-перенос существующего блока между станками/временем ----

  startBlockDrag(params: {
    assignmentId: string
    orderId: string
    orderCode: string
    priority: OrderPriority
    rowIndex: number
    hourStart: number
    durationHours: number
    grabOffsetHours: number
    requiredGroupId: string
  }): void {
    this.clearSelection()
    this.dragGhost = {
      assignmentId: params.assignmentId,
      orderId: params.orderId,
      orderCode: params.orderCode,
      priority: params.priority,
      originRowIndex: params.rowIndex,
      originHourStart: params.hourStart,
      durationHours: params.durationHours,
      targetRowIndex: params.rowIndex,
      targetHourStart: params.hourStart,
      grabOffsetHours: params.grabOffsetHours,
      requiredGroupId: params.requiredGroupId,
    }
  }

  updateBlockDragTarget(rowIndex: number, cursorHourIndex: number): void {
    if (!this.dragGhost) return
    const row = this.flatRows[rowIndex]
    const targetRowIndex = row && row.kind === 'machine' ? rowIndex : this.dragGhost.targetRowIndex
    this.dragGhost = {
      ...this.dragGhost,
      targetRowIndex,
      targetHourStart: Math.max(0, cursorHourIndex - this.dragGhost.grabOffsetHours),
    }
  }

  cancelBlockDrag(): void {
    this.dragGhost = null
  }

  // ---- Превью гипотетического слота из мастера заказа ----

  rowIndexForMachine(machineId: string): number | null {
    const index = this.flatRows.findIndex((r) => r.kind === 'machine' && r.machine.id === machineId)
    return index === -1 ? null : index
  }

  setPreviewGhost(params: { machineId: string; hourStart: number; durationHours: number; label: string } | null): void {
    if (!params) {
      this.previewGhost = null
      return
    }
    const machine = this.machines.find((m) => m.id === params.machineId)
    if (machine && this.collapsedWorkshopIds.has(machine.workshopId)) {
      this.collapsedWorkshopIds.delete(machine.workshopId)
    }
    const rowIndex = this.rowIndexForMachine(params.machineId)
    if (rowIndex === null) {
      this.previewGhost = null
      return
    }
    this.previewGhost = { label: params.label, machineId: params.machineId, rowIndex, hourStart: params.hourStart, durationHours: params.durationHours }
  }

  get selectedMachines(): Machine[] {
    if (!this.selection) return []
    const rows = this.flatRows.slice(this.selection.rowStart, this.selection.rowEnd + 1)
    return rows.filter((r): r is Extract<FlatRow, { kind: 'machine' }> => r.kind === 'machine').map((r) => r.machine)
  }

  get selectionRangeMs(): { start: number; end: number } | null {
    if (!this.selection) return null
    return {
      start: this.epochMs + this.selection.hourStart * HOUR_MS,
      end: this.epochMs + this.selection.hourEnd * HOUR_MS,
    }
  }
}
