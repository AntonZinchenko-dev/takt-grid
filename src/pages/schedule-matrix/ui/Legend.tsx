const PRIORITY_ITEMS = [
  { label: 'Низкий приоритет', color: 'var(--color-priority-low)' },
  { label: 'Средний приоритет', color: 'var(--color-priority-normal)' },
  { label: 'Высокий приоритет', color: 'var(--color-priority-high)' },
  { label: 'Критический', color: 'var(--color-priority-critical)' },
  { label: 'Выполнен', color: 'var(--color-priority-done)' },
]

export function Legend() {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Условные обозначения</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[var(--color-ink-600)]">
        {PRIORITY_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm border border-[var(--color-ink-400)]"
            style={{ backgroundImage: 'repeating-linear-gradient(135deg, var(--color-ink-400) 0, var(--color-ink-400) 1.5px, transparent 1.5px, transparent 4px)' }}
          />
          Простой / ТО
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 shrink-0 bg-red-500" style={{ borderTop: '1px dashed #ef4444' }} />
          Текущее время
        </span>
      </div>
    </div>
  )
}
