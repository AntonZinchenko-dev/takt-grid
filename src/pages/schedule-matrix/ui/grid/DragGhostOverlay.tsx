interface DragGhostOverlayProps {
  label: string
  leftPx: number
  topPx: number
  widthPx: number
  heightPx: number
  isValid: boolean
}

export function DragGhostOverlay({ label, leftPx, topPx, widthPx, heightPx, isValid }: DragGhostOverlayProps) {
  const color = isValid ? 'var(--color-priority-low)' : 'var(--color-priority-critical)'

  return (
    <div
      className="pointer-events-none absolute z-20 flex items-center rounded-md border-2 px-2 text-[11px] font-semibold leading-tight shadow-lg"
      style={{
        left: leftPx,
        top: topPx,
        width: Math.max(widthPx - 2, 3),
        height: heightPx,
        backgroundColor: isValid ? 'var(--color-priority-low-bg)' : 'var(--color-priority-critical-bg)',
        borderColor: color,
        color,
        opacity: 0.95,
      }}
    >
      <span className="truncate">{label}</span>
    </div>
  )
}
