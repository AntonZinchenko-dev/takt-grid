import { useSearchParams } from 'react-router-dom'
import { Calendar, Users, Bell, SlidersHorizontal, Settings as SettingsIcon, Link2, ShieldCheck } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { cn } from '@/shared/lib/cn'
import { WorkCalendarTab } from './tabs/WorkCalendarTab'
import { UsersTab } from './tabs/UsersTab'
import { NotificationsTab } from './tabs/NotificationsTab'
import { PlanningTab } from './tabs/PlanningTab'
import { SystemTab } from './tabs/SystemTab'
import { IntegrationsTab } from './tabs/IntegrationsTab'
import { SecurityTab } from './tabs/SecurityTab'

const TABS = [
  { id: 'calendar', label: 'Рабочий календарь', icon: Calendar, Component: WorkCalendarTab },
  { id: 'users', label: 'Пользователи и роли', icon: Users, Component: UsersTab },
  { id: 'notifications', label: 'Уведомления', icon: Bell, Component: NotificationsTab },
  { id: 'planning', label: 'Планирование', icon: SlidersHorizontal, Component: PlanningTab },
  { id: 'system', label: 'Система', icon: SettingsIcon, Component: SystemTab },
  { id: 'integrations', label: 'Интеграции', icon: Link2, Component: IntegrationsTab },
  { id: 'security', label: 'Безопасность', icon: ShieldCheck, Component: SecurityTab },
] as const

export type SettingsTabId = (typeof TABS)[number]['id']

function isTabId(value: string | null): value is SettingsTabId {
  return TABS.some((t) => t.id === value)
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab: SettingsTabId = isTabId(rawTab) ? rawTab : 'calendar'
  const ActiveComponent = TABS.find((t) => t.id === activeTab)!.Component

  return (
    <>
      <TopHeader title="Настройки" subtitle="Управление системой и параметрами планирования" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[var(--color-brand-600)] text-[var(--color-brand-600)]'
                  : 'border-transparent text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <ActiveComponent />
      </main>
    </>
  )
}
