import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HelpCircle, Lightbulb, LayoutGrid, Grid3x3, ClipboardList, Cog, Package, AlertTriangle, BarChart3, CalendarDays, Settings } from 'lucide-react'

const SECTIONS = [
  { to: '/', label: 'Дашборд', icon: LayoutGrid, description: 'Обзор текущей загрузки и ключевые показатели' },
  { to: '/matrix', label: 'Матрица планирования', icon: Grid3x3, description: 'Планируйте загрузку станков и выполняйте заказы' },
  { to: '/orders', label: 'Заказы', icon: ClipboardList, description: 'Полный реестр заказов с фильтрами' },
  { to: '/machines', label: 'Станки и оборудование', icon: Cog, description: 'Парк оборудования, статусы, история простоев' },
  { to: '/catalog', label: 'Продукция и техкарты', icon: Package, description: 'Каталог продуктов и параметры техкарт' },
  { to: '/conflicts', label: 'Конфликты', icon: AlertTriangle, description: 'Пересечения по станкам и заказы под угрозой дедлайна' },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3, description: 'Загрузка, выпуск и простои за период' },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays, description: 'Рабочий календарь и загрузка по дням' },
  { to: '/settings', label: 'Настройки', icon: Settings, description: 'Рабочий календарь, роли, пороги уведомлений' },
] as const

const MATRIX_LEGEND = [
  { label: 'Низкий приоритет', color: 'var(--color-priority-low)' },
  { label: 'Средний приоритет', color: 'var(--color-priority-normal)' },
  { label: 'Высокий приоритет', color: 'var(--color-priority-high)' },
  { label: 'Критический', color: 'var(--color-priority-critical)' },
  { label: 'Выполнен', color: 'var(--color-priority-done)' },
] as const

const GLOBAL_SHORTCUTS = [{ keys: 'Ctrl/⌘ K', label: 'Командная палитра — поиск и быстрые переходы' }]

const MATRIX_SHORTCUTS = [
  { keys: 'Ctrl/⌘ Z', label: 'Отменить последнее действие' },
  { keys: 'Ctrl/⌘ ⇧ Z', label: 'Повторить отменённое действие' },
  { keys: 'Esc', label: 'Отменить активный перенос заказа' },
]

const TIPS: Record<string, string> = {
  '/': 'В таблице «Заказы, требующие внимания» кнопка «Открыть» сразу переносит в нужный момент матрицы планирования.',
  '/matrix': 'Перетащите блок заказа на другой станок или время, чтобы перенести его — Esc отменяет перенос. Потяните по пустой области грида, чтобы выделить несколько заказов для массового редактирования количества.',
  '/orders': 'Комбинируйте поиск с фильтрами по статусу и приоритету, чтобы быстро найти нужные заказы в реестре.',
  '/machines': 'Откройте карточку станка, чтобы добавить простой или ТО — интервал сразу учтётся в матрице планирования.',
  '/catalog': 'Измените параметры техкарты продукта (выработка в час, кратность упаковки) — расчёт длительности обновится для новых назначений.',
  '/conflicts': 'Здесь собраны все пересечения по станкам и заказы под угрозой срыва дедлайна — то же самое, что в колокольчике уведомлений, но полным списком.',
  '/analytics': 'Переключайте период просмотра, чтобы сравнить загрузку, выпуск и простои за разные интервалы.',
  '/calendar': 'Рабочий календарь показывает, какие дни считаются рабочими при планировании загрузки.',
  '/settings': 'Изменения на этой странице сохраняются только в рамках текущей сессии браузера.',
}

export function HelpMenu() {
  const navigate = useNavigate()
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const tip = TIPS[location.pathname]

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]"
        aria-label="Справка"
      >
        <HelpCircle className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          {tip && (
            <div className="flex items-start gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-3.5 py-2.5">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-brand-600)]" />
              <p className="text-xs text-[var(--color-ink-600)]">{tip}</p>
            </div>
          )}

          <div className="border-b border-[var(--color-border)] px-3.5 py-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">Горячие клавиши</p>
            <div className="space-y-1">
              {[...GLOBAL_SHORTCUTS, ...(location.pathname === '/matrix' ? MATRIX_SHORTCUTS : [])].map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-3 text-xs text-[var(--color-ink-600)]">
                  <span>{s.label}</span>
                  <kbd className="shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-canvas)] px-1.5 py-0.5 font-sans text-[10px] font-medium text-[var(--color-ink-600)]">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>

          {location.pathname === '/matrix' && (
            <div className="border-b border-[var(--color-border)] px-3.5 py-2.5">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">Условные обозначения</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--color-ink-600)]">
                {MATRIX_LEGEND.map((item) => (
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
                  <span className="h-0.5 w-3 shrink-0 bg-red-500" />
                  Текущее время
                </span>
              </div>
            </div>
          )}

          <p className="px-3.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">Разделы системы</p>
          <div className="max-h-80 overflow-y-auto py-1">
            {SECTIONS.map(({ to, label, icon: Icon, description }) => (
              <button
                key={to}
                onClick={() => {
                  setOpen(false)
                  navigate(to)
                }}
                className="flex w-full items-start gap-2.5 px-3.5 py-2 text-left hover:bg-[var(--color-canvas)]"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ink-400)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--color-ink-900)]">{label}</span>
                  <span className="block truncate text-xs text-[var(--color-ink-600)]">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
