import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ClipboardList, Wrench, Package, X } from 'lucide-react'
import { useOrdersQuery } from '@/entities/order'
import { useMachinesQuery } from '@/entities/machine'
import { useProductsQuery } from '@/entities/product'
import { NotificationsMenu } from './NotificationsMenu'
import { HelpMenu } from './HelpMenu'
import { ProfileMenu } from './ProfileMenu'

interface TopHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

const MAX_RESULTS_PER_GROUP = 5

export function TopHeader({ title, subtitle, actions }: TopHeaderProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const hasQuery = debouncedQuery.length > 0
  const ordersQuery = useOrdersQuery({ search: debouncedQuery, limit: MAX_RESULTS_PER_GROUP }, { enabled: hasQuery })
  const machinesQuery = useMachinesQuery()
  const productsQuery = useProductsQuery()

  const machineResults = useMemo(() => {
    if (!hasQuery) return []
    const q = debouncedQuery.toLowerCase()
    return (machinesQuery.data ?? []).filter((m) => m.name.toLowerCase().includes(q)).slice(0, MAX_RESULTS_PER_GROUP)
  }, [hasQuery, debouncedQuery, machinesQuery.data])

  const productResults = useMemo(() => {
    if (!hasQuery) return []
    const q = debouncedQuery.toLowerCase()
    return (productsQuery.data ?? []).filter((p) => p.name.toLowerCase().includes(q)).slice(0, MAX_RESULTS_PER_GROUP)
  }, [hasQuery, debouncedQuery, productsQuery.data])

  const orderResults = hasQuery ? (ordersQuery.data ?? []) : []
  const noResults = hasQuery && orderResults.length === 0 && machineResults.length === 0 && productResults.length === 0

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const close = () => setOpen(false)

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
      <div className="min-w-0 shrink-0">
        <h1 className="truncate text-lg font-semibold text-[var(--color-ink-900)]">{title}</h1>
        {subtitle && <p className="truncate text-xs text-[var(--color-ink-600)]">{subtitle}</p>}
      </div>

      <div ref={containerRef} className="relative mx-auto w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-400)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close()
          }}
          placeholder="Поиск заказов, станков, продуктов..."
          className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] pl-9 pr-8 text-sm text-[var(--color-ink-900)] outline-none placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-brand-500)] focus:bg-[var(--color-surface)]"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setDebouncedQuery('')
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]"
            aria-label="Очистить поиск"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {open && hasQuery && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 text-left shadow-lg">
            {orderResults.length > 0 && (
              <div>
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">Заказы</p>
                {orderResults.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      navigate('/matrix', { state: { jumpToIso: order.deadline, highlightOrderId: order.id } })
                      close()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-[var(--color-canvas)]"
                  >
                    <ClipboardList className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-[var(--color-ink-900)]">{order.code}</span>
                      <span className="text-[var(--color-ink-600)]"> · {order.productName}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {machineResults.length > 0 && (
              <div>
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">Станки</p>
                {machineResults.map((machine) => (
                  <button
                    key={machine.id}
                    onClick={() => {
                      navigate('/machines', { state: { openMachineId: machine.id } })
                      close()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-[var(--color-canvas)]"
                  >
                    <Wrench className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                    <span className="truncate text-[var(--color-ink-900)]">{machine.name}</span>
                  </button>
                ))}
              </div>
            )}

            {productResults.length > 0 && (
              <div>
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">Продукты</p>
                {productResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      navigate('/catalog', { state: { highlightProductId: product.id } })
                      close()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-[var(--color-canvas)]"
                  >
                    <Package className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                    <span className="truncate text-[var(--color-ink-900)]">{product.name}</span>
                  </button>
                ))}
              </div>
            )}

            {noResults && <p className="px-3 py-2 text-sm text-[var(--color-ink-400)]">Ничего не найдено</p>}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {actions}
        <NotificationsMenu />
        <HelpMenu />
        <ProfileMenu />
      </div>
    </header>
  )
}
