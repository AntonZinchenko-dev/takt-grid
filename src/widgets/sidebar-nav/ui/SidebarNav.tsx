import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  Grid3x3,
  ClipboardList,
  Cog,
  Package,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useSidebarStore } from '../model/sidebar-store'
import { cn } from '@/shared/lib/cn'

const NAV_ITEMS = [
  { to: '/', label: 'Дашборд', icon: LayoutGrid, end: true },
  { to: '/matrix', label: 'Матрица планирования', icon: Grid3x3 },
  { to: '/orders', label: 'Заказы', icon: ClipboardList },
  { to: '/machines', label: 'Станки и оборудование', icon: Cog },
  { to: '/catalog', label: 'Продукция и техкарты', icon: Package },
  { to: '/conflicts', label: 'Конфликты', icon: AlertTriangle },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3 },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays },
  { to: '/settings', label: 'Настройки', icon: Settings },
] as const

export function SidebarNav() {
  const collapsed = useSidebarStore((s) => s.collapsed)
  const toggle = useSidebarStore((s) => s.toggle)

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-150',
        collapsed ? 'w-[68px]' : 'w-[248px]',
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-600)]">
          <Grid3x3 className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight text-[var(--color-ink-900)]">TaktGrid</p>
            <p className="truncate text-[11px] leading-tight text-[var(--color-ink-600)]">Производственное планирование</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-2 scrollbar-thin">
        {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : false}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                  : 'text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink-900)]',
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--color-border)] p-2.5">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]"
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          {!collapsed && <span>Свернуть меню</span>}
        </button>
        {!collapsed && (
          <p className="mt-2 px-2.5 text-[11px] text-[var(--color-ink-400)]">© {new Date().getFullYear()} Anton Zinchenko</p>
        )}
      </div>
    </aside>
  )
}
