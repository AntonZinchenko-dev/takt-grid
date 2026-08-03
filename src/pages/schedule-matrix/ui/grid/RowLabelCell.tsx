import { ChevronDown, ChevronRight } from 'lucide-react'
import type { FlatRow } from '../../model/grid-store'
import { cn } from '@/shared/lib/cn'

const STATUS_COLOR: Record<string, string> = {
  running: '#16a34a',
  idle: '#eab308',
  down: '#dc2626',
}

interface RowLabelCellProps {
  row: FlatRow
  top: number
  height: number
  collapsed?: boolean
  onToggleWorkshop?: (workshopId: string) => void
}

export function RowLabelCell({ row, top, height, collapsed, onToggleWorkshop }: RowLabelCellProps) {
  if (row.kind === 'workshop') {
    return (
      <button
        onClick={() => onToggleWorkshop?.(row.workshop.id)}
        className="absolute left-0 flex w-full items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-3 text-left text-[13px] font-semibold text-[var(--color-ink-900)] hover:bg-slate-100"
        style={{ top, height }}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{row.workshop.name}</span>
      </button>
    )
  }

  return (
    <div
      className={cn('absolute left-0 flex w-full items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 pl-7 text-sm')}
      style={{ top, height }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR[row.machine.status] }} />
      <span className="truncate text-[var(--color-ink-900)]">{row.machine.name}</span>
    </div>
  )
}
