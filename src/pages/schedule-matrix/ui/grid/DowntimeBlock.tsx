interface DowntimeBlockProps {
  leftPx: number
  widthPx: number
  topPx: number
  heightPx: number
  reason: string
}

export function DowntimeBlock({ leftPx, widthPx, topPx, heightPx, reason }: DowntimeBlockProps) {
  return (
    <div
      title={reason}
      className="pointer-events-auto absolute rounded-md border border-[var(--color-ink-400)]"
      style={{
        left: leftPx,
        width: Math.max(widthPx - 2, 3),
        top: topPx,
        height: heightPx,
        backgroundColor: '#f8fafc',
        backgroundImage:
          'repeating-linear-gradient(135deg, var(--color-ink-400) 0, var(--color-ink-400) 1.5px, transparent 1.5px, transparent 7px)',
      }}
    />
  )
}
