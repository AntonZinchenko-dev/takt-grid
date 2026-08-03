import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string
  bg?: string
}

/** Универсальный бейдж; цвет передаётся CSS-переменной, чтобы не плодить варианты под каждый статус. */
export function Badge({ color = 'var(--color-ink-600)', bg = 'var(--color-canvas)', className, style, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', className)}
      style={{ color, backgroundColor: bg, ...style }}
      {...props}
    />
  )
}

export function StatusDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />
}
