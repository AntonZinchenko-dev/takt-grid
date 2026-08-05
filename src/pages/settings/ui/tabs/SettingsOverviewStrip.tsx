import { useSearchParams } from 'react-router-dom'
import { Users, UserCog, UsersRound, Radio, ListChecks, FileText, SlidersHorizontal, ChevronRight, Settings2, Import, Archive, Link2, KeyRound, Database, Lock, ScanFace, Monitor, Info } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { useTeamMembersQuery, useRolesQuery, useGroupsQuery } from '@/entities/user'
import { useNotificationChannelsQuery, useNotificationRulesQuery, useNotificationTemplatesQuery } from '@/entities/notification-setting'
import type { SettingsTabId } from '../SettingsPage'

interface OverviewRow {
  icon: typeof Users
  label: string
  sublabel: string
  count?: number
}

function RowButton({ row, onClick }: { row: OverviewRow; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left hover:bg-[var(--color-canvas)]">
      <row.icon className="h-4 w-4 shrink-0 text-[var(--color-ink-400)]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-ink-900)]">{row.label}</p>
        <p className="text-xs text-[var(--color-ink-400)]">{row.sublabel}</p>
      </div>
      {row.count !== undefined && <span className="text-sm font-medium tabular-nums text-[var(--color-ink-600)]">{row.count}</span>}
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
    </button>
  )
}

/** Сводные карточки-ярлыки на остальные вкладки настроек — показываются на вкладке "Рабочий календарь" (см. скриншот целевого дизайна). */
export function SettingsOverviewStrip() {
  const [, setSearchParams] = useSearchParams()
  const goTo = (tab: SettingsTabId) => setSearchParams({ tab })

  const teamMembersQuery = useTeamMembersQuery()
  const rolesQuery = useRolesQuery()
  const groupsQuery = useGroupsQuery()
  const channelsQuery = useNotificationChannelsQuery()
  const rulesQuery = useNotificationRulesQuery()
  const templatesQuery = useNotificationTemplatesQuery()

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Пользователи и роли</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">Управление пользователями, ролями и правами доступа</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-0.5">
            <RowButton row={{ icon: Users, label: 'Пользователи', sublabel: 'Управление учётными записями пользователей', count: teamMembersQuery.data?.length }} onClick={() => goTo('users')} />
            <RowButton row={{ icon: UserCog, label: 'Роли и права', sublabel: 'Настройка ролей и разрешений в системе', count: rolesQuery.data?.length }} onClick={() => goTo('users')} />
            <RowButton row={{ icon: UsersRound, label: 'Группы', sublabel: 'Управление группами пользователей', count: groupsQuery.data?.length }} onClick={() => goTo('users')} />
            <button type="button" onClick={() => goTo('users')} className="pt-1 text-sm font-medium text-[var(--color-brand-600)] hover:underline">
              Перейти к управлению
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Уведомления</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">Настройка каналов и правил уведомлений</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-0.5">
            <RowButton row={{ icon: Radio, label: 'Каналы уведомлений', sublabel: 'Email, Push, SMS, Telegram', count: channelsQuery.data?.length }} onClick={() => goTo('notifications')} />
            <RowButton row={{ icon: ListChecks, label: 'Правила уведомлений', sublabel: 'Настройка событий и условий', count: rulesQuery.data?.length }} onClick={() => goTo('notifications')} />
            <RowButton row={{ icon: FileText, label: 'Шаблоны сообщений', sublabel: 'Шаблоны для различных уведомлений', count: templatesQuery.data?.length }} onClick={() => goTo('notifications')} />
            <button type="button" onClick={() => goTo('notifications')} className="pt-1 text-sm font-medium text-[var(--color-brand-600)] hover:underline">
              Настроить уведомления
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Планирование</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">Параметры планирования и расчёта загрузки</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-0.5">
            <RowButton row={{ icon: Settings2, label: 'Общие параметры', sublabel: 'Основные настройки планирования' }} onClick={() => goTo('planning')} />
            <RowButton row={{ icon: SlidersHorizontal, label: 'Расчёт загрузки', sublabel: 'Алгоритмы и коэффициенты' }} onClick={() => goTo('planning')} />
            <RowButton row={{ icon: ListChecks, label: 'Приоритеты заказов', sublabel: 'Правила приоритизации' }} onClick={() => goTo('planning')} />
            <button type="button" onClick={() => goTo('planning')} className="pt-1 text-sm font-medium text-[var(--color-brand-600)] hover:underline">
              Настроить планирование
            </button>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Система</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">Общие системные настройки</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-0.5">
            <RowButton row={{ icon: Settings2, label: 'Общие настройки', sublabel: 'Язык, формат даты, единицы измерения' }} onClick={() => goTo('system')} />
            <RowButton row={{ icon: Import, label: 'Импорт/экспорт', sublabel: 'Настройки импорта и экспорта данных' }} onClick={() => goTo('system')} />
            <RowButton row={{ icon: Archive, label: 'Резервное копирование', sublabel: 'Настройки резервного копирования' }} onClick={() => goTo('system')} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Интеграции</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">Настройка внешних систем и API</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-0.5">
            <RowButton row={{ icon: KeyRound, label: 'API и вебхуки', sublabel: 'Настройка API и webhook endpoints' }} onClick={() => goTo('integrations')} />
            <RowButton row={{ icon: Link2, label: 'Интеграции', sublabel: 'Подключение к внешним системам' }} onClick={() => goTo('integrations')} />
            <RowButton row={{ icon: Database, label: 'Базы данных', sublabel: 'Настройки подключения к БД' }} onClick={() => goTo('integrations')} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Безопасность</CardTitle>
              <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">Настройки безопасности и доступа</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-0.5">
            <RowButton row={{ icon: Lock, label: 'Политика паролей', sublabel: 'Требования к паролям' }} onClick={() => goTo('security')} />
            <RowButton row={{ icon: ScanFace, label: 'Двухфакторная аутентификация', sublabel: 'Настройка 2FA для пользователей' }} onClick={() => goTo('security')} />
            <RowButton row={{ icon: Monitor, label: 'Сессии', sublabel: 'Управление активными сессиями' }} onClick={() => goTo('security')} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>О системе</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-400)]">TaktGrid Production Planner</span>
              <span className="font-medium text-[var(--color-ink-900)]">Версия 1.4.2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-400)]">Лицензия</span>
              <span className="font-medium text-[var(--color-brand-600)]">Enterprise</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-ink-400)]">Поддержка</span>
              <a href="mailto:support@taktgrid.ru" className="font-medium text-[var(--color-brand-600)] hover:underline">
                support@taktgrid.ru
              </a>
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-[var(--color-ink-400)]">
              <Info className="h-3 w-3 shrink-0" />
              Демо-проект — документация не подключена
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
