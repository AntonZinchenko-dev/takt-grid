import type { SelectionRange } from '../../model/grid-store'

interface SelectionOverlayProps {
  selection: SelectionRange
  rowOffsets: number[]
  hourWidth: number
}

export function SelectionOverlay({ selection, rowOffsets, hourWidth }: SelectionOverlayProps) {
  const top = rowOffsets[selection.rowStart] ?? 0
  const bottom = rowOffsets[selection.rowEnd + 1] ?? top
  const left = selection.hourStart * hourWidth
  const width = (selection.hourEnd - selection.hourStart) * hourWidth

  return (
    <div
      className="pointer-events-none absolute z-10 rounded-sm border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-500)]/15"
      style={{ left, width, top, height: bottom - top }}
    />
  )
}
