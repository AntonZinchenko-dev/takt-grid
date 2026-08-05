import { Users } from 'lucide-react'
import type { PresencePeer } from '../model/use-presence-channel'

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface PresenceBarProps {
  selfName: string
  peers: PresencePeer[]
}

/**
 * Индикатор "живого" присутствия других вкладок (см. use-presence-channel.ts). Осознанно не
 * пытается позиционировать курсор пиксель-в-пиксель — вкладки не синхронизируют зум/скролл,
 * поэтому это была бы обманчивая точность. Вместо этого — кто сейчас "здесь" и кто активно
 * что-то тащит по графику прямо сейчас (пульсирующая точка).
 */
export function PresenceBar({ selfName, peers }: PresenceBarProps) {
  if (peers.length === 0) return null

  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-1.5 text-xs text-[var(--color-ink-600)]">
      <Users className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
      <span>Вы: {selfName}</span>
      <span className="text-[var(--color-ink-400)]">·</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {peers.map((peer) => (
          <span key={peer.tabId} className="flex items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-0.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[9px] font-semibold text-[var(--color-brand-700)]">
              {initials(peer.actorName)}
            </span>
            {peer.actorName}
            {peer.dragging && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-priority-high)]" title="Сейчас переносит заказ" />}
          </span>
        ))}
      </div>
    </div>
  )
}
