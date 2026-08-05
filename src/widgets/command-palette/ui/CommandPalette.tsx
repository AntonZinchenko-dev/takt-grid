import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ClipboardList,
  Wrench,
  Package,
  Plus,
  LayoutDashboard,
  Table2,
  ListOrdered,
  Boxes,
  AlertTriangle,
  BarChart3,
  Calendar,
  Settings,
  UserRound,
} from 'lucide-react'
import { useOrdersQuery } from '@/entities/order'
import { useMachinesQuery } from '@/entities/machine'
import { useProductsQuery } from '@/entities/product'

const MAX_RESULTS_PER_GROUP = 5

interface PaletteItem {
  id: string
  icon: ComponentType<{ className?: string }>
  label: string
  sublabel?: string
  onSelect: () => void
}

interface PaletteGroup {
  label: string
  items: PaletteItem[]
}

export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 200)
    return () => window.clearTimeout(timer)
  }, [query])

  const hasQuery = debouncedQuery.length > 0
  const q = debouncedQuery.toLowerCase()

  const ordersQuery = useOrdersQuery({ search: debouncedQuery, limit: MAX_RESULTS_PER_GROUP }, { enabled: open && hasQuery })
  const machinesQuery = useMachinesQuery()
  const productsQuery = useProductsQuery()

  const close = () => setOpen(false)

  const navAndActionItems = useMemo<PaletteItem[]>(
    () => [
      { id: 'action-create-order', icon: Plus, label: 'Создать заказ', onSelect: () => navigate('/matrix', { state: { openWizard: true } }) },
      { id: 'nav-dashboard', icon: LayoutDashboard, label: 'Дашборд', onSelect: () => navigate('/') },
      { id: 'nav-matrix', icon: Table2, label: 'Матрица планирования', onSelect: () => navigate('/matrix') },
      { id: 'nav-orders', icon: ListOrdered, label: 'Заказы', onSelect: () => navigate('/orders') },
      { id: 'nav-machines', icon: Wrench, label: 'Станки и оборудование', onSelect: () => navigate('/machines') },
      { id: 'nav-catalog', icon: Boxes, label: 'Продукция и техкарты', onSelect: () => navigate('/catalog') },
      { id: 'nav-conflicts', icon: AlertTriangle, label: 'Конфликты', onSelect: () => navigate('/conflicts') },
      { id: 'nav-analytics', icon: BarChart3, label: 'Аналитика', onSelect: () => navigate('/analytics') },
      { id: 'nav-calendar', icon: Calendar, label: 'Календарь', onSelect: () => navigate('/calendar') },
      { id: 'nav-settings', icon: Settings, label: 'Настройки', onSelect: () => navigate('/settings') },
      { id: 'nav-profile', icon: UserRound, label: 'Профиль', onSelect: () => navigate('/profile') },
    ],
    [navigate],
  )

  const groups = useMemo<PaletteGroup[]>(() => {
    const filteredNav = hasQuery ? navAndActionItems.filter((item) => item.label.toLowerCase().includes(q)) : navAndActionItems
    const result: PaletteGroup[] = [{ label: 'Действия и разделы', items: filteredNav }]

    if (hasQuery) {
      const orderItems: PaletteItem[] = (ordersQuery.data ?? []).map((order) => ({
        id: `order-${order.id}`,
        icon: ClipboardList,
        label: order.code,
        sublabel: order.productName,
        onSelect: () => navigate('/matrix', { state: { jumpToIso: order.deadline, highlightOrderId: order.id } }),
      }))
      const machineItems: PaletteItem[] = (machinesQuery.data ?? [])
        .filter((m) => m.name.toLowerCase().includes(q))
        .slice(0, MAX_RESULTS_PER_GROUP)
        .map((machine) => ({ id: `machine-${machine.id}`, icon: Wrench, label: machine.name, onSelect: () => navigate('/machines', { state: { openMachineId: machine.id } }) }))
      const productItems: PaletteItem[] = (productsQuery.data ?? [])
        .filter((p) => p.name.toLowerCase().includes(q))
        .slice(0, MAX_RESULTS_PER_GROUP)
        .map((product) => ({ id: `product-${product.id}`, icon: Package, label: product.name, onSelect: () => navigate('/catalog', { state: { highlightProductId: product.id } }) }))

      if (orderItems.length > 0) result.push({ label: 'Заказы', items: orderItems })
      if (machineItems.length > 0) result.push({ label: 'Станки', items: machineItems })
      if (productItems.length > 0) result.push({ label: 'Продукты', items: productItems })
    }

    return result.filter((g) => g.items.length > 0)
  }, [hasQuery, q, navAndActionItems, ordersQuery.data, machinesQuery.data, productsQuery.data, navigate])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  useEffect(() => {
    setActiveIndex(0)
  }, [flatItems.length])

  const activate = (item: PaletteItem) => {
    item.onSelect()
    close()
  }

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (flatItems.length === 0 ? 0 : (i + 1) % flatItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (flatItems.length === 0 ? 0 : (i - 1 + flatItems.length) % flatItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[activeIndex]
      if (item) activate(item)
    }
  }

  if (!open) return null

  let renderedIndex = -1

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/30" onClick={close} />
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-ink-400)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск заказов, станков, продуктов, разделов…"
            className="h-6 w-full bg-transparent text-sm text-[var(--color-ink-900)] outline-none placeholder:text-[var(--color-ink-400)]"
          />
          <kbd className="shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-400)]">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-1.5">
          {groups.length === 0 && <p className="px-4 py-3 text-sm text-[var(--color-ink-400)]">Ничего не найдено</p>}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">{group.label}</p>
              {group.items.map((item) => {
                renderedIndex += 1
                const isActive = renderedIndex === activeIndex
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setActiveIndex(renderedIndex)}
                    onClick={() => activate(item)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm ${isActive ? 'bg-[var(--color-canvas)]' : ''}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-[var(--color-ink-900)]">{item.label}</span>
                      {item.sublabel && <span className="text-[var(--color-ink-600)]"> · {item.sublabel}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
