import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

const MAX_PAGE_BUTTONS = 7

export function Pagination({ page, pageSize, total, onPageChange, className }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = buildPageList(page, pageCount)

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3', className)}>
      <p className="text-xs text-[var(--color-ink-400)]">
        Показано {from}–{to} из {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Предыдущая страница"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1.5 text-xs text-[var(--color-ink-400)]">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors',
                p === page ? 'bg-[var(--color-brand-600)] text-white' : 'text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Следующая страница"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** Полный список страниц, если их мало; иначе первая/последняя + окно вокруг текущей с многоточиями. */
function buildPageList(current: number, count: number): Array<number | 'ellipsis'> {
  if (count <= MAX_PAGE_BUTTONS) return Array.from({ length: count }, (_, i) => i + 1)

  const keep = new Set<number>([1, count, current, current - 1, current + 1])
  const sorted = [...keep].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)

  const result: Array<number | 'ellipsis'> = []
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!
    if (i > 0 && p - sorted[i - 1]! > 1) result.push('ellipsis')
    result.push(p)
  }
  return result
}
