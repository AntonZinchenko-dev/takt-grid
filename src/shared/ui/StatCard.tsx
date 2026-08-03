import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from './Card'
import { cn } from '@/shared/lib/cn'

interface StatCardProps {
  icon: ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  trend?: { direction: 'up' | 'down'; label: string; positive?: boolean }
}

export function StatCard({ icon, iconBg, iconColor, label, value, trend }: StatCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: iconBg, color: iconColor }}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] text-[var(--color-ink-600)]">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-[var(--color-ink-900)]">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-xs font-medium',
                trend.positive === false ? 'text-red-700' : 'text-emerald-700',
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {trend.label}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
