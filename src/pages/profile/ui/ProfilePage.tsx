import { useMemo, useState } from 'react'
import { startOfDay, endOfDay, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Mail,
  Phone,
  Clock,
  Pencil,
  CheckCircle2,
  Circle,
  Calendar,
  History,
  Monitor,
  Shield,
  KeyRound,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { useAuthStore, type NotificationPrefs, type WorkPreferences } from '@/entities/session'
import { useOrdersPageQuery } from '@/entities/order'
import { useAssignmentsWindowQuery } from '@/entities/schedule-assignment'
import { ProfileEditDrawer } from './ProfileEditDrawer'
import { ChangePasswordDrawer } from './ChangePasswordDrawer'

const PERMISSIONS = [
  { label: 'Планирование', granted: true },
  { label: 'Bulk Edit', granted: true },
  { label: 'Просмотр аналитики', granted: true },
  { label: 'Экспорт данных', granted: true },
  { label: 'Управление оборудованием', granted: true },
  { label: 'Управление пользователями', granted: false },
  { label: 'Настройки предприятия', granted: false },
]

const RECENT_ACTIONS = [
  { when: 'Сегодня, 15:42', label: 'Перенос заказа', ref: 'WO-2026-1174', detail: 'Станок: Токарный CTX 310' },
  { when: 'Вчера, 11:28', label: 'Создал заказ', ref: 'WO-2026-1299', detail: 'Продукт: Плата монтажная' },
  { when: '02 августа, 16:05', label: 'Bulk Edit', ref: null, detail: '18 операций, 6 станков' },
]

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const notifications = useAuthStore((s) => s.notifications)
  const setNotification = useAuthStore((s) => s.setNotification)
  const preferences = useAuthStore((s) => s.preferences)
  const setPreferences = useAuthStore((s) => s.setPreferences)
  const twoFactorEnabled = useAuthStore((s) => s.twoFactorEnabled)
  const toggleTwoFactor = useAuthStore((s) => s.toggleTwoFactor)
  const loginHistory = useAuthStore((s) => s.loginHistory)

  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const todayRange = useMemo(() => ({ from: startOfDay(new Date()).toISOString(), to: endOfDay(new Date()).toISOString() }), [])
  const assignedTodayQuery = useAssignmentsWindowQuery(todayRange.from, todayRange.to)
  const overdueQuery = useOrdersPageQuery({ status: 'overdue', page: 1, pageSize: 1 })

  if (!user) return null

  const toggleNotification = (key: keyof NotificationPrefs) => setNotification(key, !notifications[key])
  const setPreference = <K extends keyof WorkPreferences>(key: K, value: WorkPreferences[K]) => setPreferences({ [key]: value })
  const currentSession = loginHistory[0]

  return (
    <>
      <TopHeader title="Профиль пользователя" subtitle="Управление аккаунтом, настройками и безопасностью" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardBody className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-lg font-semibold text-white">
                    {user.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--color-ink-900)]">{user.name}</p>
                    <p className="text-sm text-[var(--color-ink-600)]">{user.department}</p>
                    <p className="text-xs text-[var(--color-ink-400)]">{user.workshopName}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge color="var(--color-priority-low)" bg="var(--color-priority-low-bg)">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" /> Online
                </Badge>
                <Badge color="var(--color-brand-600)" bg="var(--color-brand-50)">
                  {user.role}
                </Badge>
                <Badge>{user.shiftLabel.split('(')[0]?.trim()}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs">
                <div className="flex items-start gap-1.5">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                  <div>
                    <p className="text-[var(--color-ink-400)]">Рабочий email</p>
                    <p className="font-medium text-[var(--color-ink-900)]">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                  <div>
                    <p className="text-[var(--color-ink-400)]">Телефон</p>
                    <p className="font-medium text-[var(--color-ink-900)]">{user.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                  <div>
                    <p className="text-[var(--color-ink-400)]">Локальное время</p>
                    <p className="font-medium text-[var(--color-ink-900)]">{format(new Date(), 'HH:mm')} (UTC+5)</p>
                  </div>
                </div>
              </div>

              <Button variant="secondary" onClick={() => setEditOpen(true)} className="w-full justify-center">
                <Pencil className="h-3.5 w-3.5" />
                Редактировать профиль
              </Button>
            </CardBody>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Сегодня</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs text-[var(--color-ink-600)]">Заказов назначено</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--color-ink-900)]">{assignedTodayQuery.data?.length ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs text-[var(--color-ink-600)]">Конфликтов</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--color-ink-900)]">2</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs text-[var(--color-ink-600)]">Просрочено</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--color-ink-900)]">{overdueQuery.data?.total ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs text-[var(--color-ink-600)]">Изменений графика</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--color-ink-900)]">14</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Эта неделя</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5 text-sm">
              {[
                ['Операций выполнено', 147],
                ['Заказов изменено', 32],
                ['Конфликтов решено', 8],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-[var(--color-ink-600)]">{label}</span>
                  <span className="font-semibold tabular-nums text-[var(--color-ink-900)]">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
                <span className="text-[var(--color-ink-600)]">Среднее время реакции</span>
                <span className="font-semibold tabular-nums text-[var(--color-ink-900)]">11 мин</span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs">
              {[
                ['Должность', user.role],
                ['Подразделение', user.department],
                ['Расположение', user.workshopName],
                ['Рабочая смена', user.shiftLabel],
                ['Дата найма', format(new Date(user.hiredAt), 'd MMMM yyyy', { locale: ru })],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--color-ink-400)]">{label}</span>
                  <span className="text-right font-medium text-[var(--color-ink-900)]">{value}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Роли и доступ</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[var(--color-ink-400)]">Роль</span>
                <Badge color="var(--color-brand-600)" bg="var(--color-brand-50)">
                  {user.role}
                </Badge>
              </div>
              {PERMISSIONS.map((p) => (
                <div key={p.label} className={`flex items-center gap-1.5 ${p.granted ? 'text-[var(--color-ink-900)]' : 'text-[var(--color-ink-400)]'}`}>
                  {p.granted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-priority-low)]" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {p.label}
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Уведомления</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs">
              {(
                [
                  ['email', 'Email-уведомления'],
                  ['push', 'Push-уведомления'],
                  ['conflicts', 'Конфликты'],
                  ['deadline', 'Изменение дедлайна'],
                  ['downtime', 'Простой оборудования'],
                  ['nightlyReport', 'Ночной отчёт'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-[var(--color-ink-900)]">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={() => toggleNotification(key)}
                    className="h-3.5 w-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]"
                  />
                  {label}
                </label>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Рабочие предпочтения</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-xs">
              <div>
                <p className="mb-1 text-[var(--color-ink-400)]">Первый экран после входа</p>
                <div className="flex gap-3">
                  {(
                    [
                      ['matrix', 'Матрица'],
                      ['dashboard', 'Дашборд'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 text-[var(--color-ink-900)]">
                      <input
                        type="radio"
                        checked={preferences.homeScreen === value}
                        onChange={() => setPreference('homeScreen', value)}
                        className="accent-[var(--color-brand-600)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[var(--color-ink-400)]">Начальный масштаб матрицы</p>
                <div className="flex gap-3">
                  {(
                    [
                      ['hour', 'Час'],
                      ['day', 'День'],
                      ['week', 'Неделя'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 text-[var(--color-ink-900)]">
                      <input
                        type="radio"
                        checked={preferences.defaultZoom === value}
                        onChange={() => setPreference('defaultZoom', value)}
                        className="accent-[var(--color-brand-600)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[var(--color-ink-400)]">Плотность интерфейса</p>
                <div className="flex gap-3">
                  {(
                    [
                      ['compact', 'Compact'],
                      ['comfortable', 'Comfortable'],
                      ['large', 'Large'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 text-[var(--color-ink-900)]">
                      <input
                        type="radio"
                        checked={preferences.density === value}
                        onChange={() => setPreference('density', value)}
                        className="accent-[var(--color-brand-600)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[var(--color-ink-400)]">Тема</p>
                <div className="flex gap-3">
                  {(
                    [
                      ['light', 'Светлая'],
                      ['dark', 'Тёмная'],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 text-[var(--color-ink-900)]">
                      <input
                        type="radio"
                        checked={preferences.theme === value}
                        onChange={() => setPreference('theme', value)}
                        className="accent-[var(--color-brand-600)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Рабочий календарь</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-[var(--color-ink-900)]">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                Моя смена
              </div>
              <p className="font-medium text-[var(--color-ink-900)]">{user.shiftLabel}</p>
              <p className="text-[var(--color-ink-400)]">Пн – Пт</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Последние действия</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5 text-xs">
              {RECENT_ACTIONS.map((a) => (
                <div key={a.label + a.when} className="flex items-start gap-1.5">
                  <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[var(--color-ink-400)]">{a.when}</p>
                    <p className="font-medium text-[var(--color-ink-900)]">
                      {a.label} {a.ref && <span className="text-[var(--color-brand-600)]">{a.ref}</span>}
                    </p>
                    <p className="text-[var(--color-ink-600)]">{a.detail}</p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Активные сессии</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2.5 text-xs">
              <div className="flex items-start gap-1.5">
                <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium text-[var(--color-ink-900)]">
                    {currentSession?.device ?? 'Этот браузер'}
                    <Badge color="var(--color-priority-low)" bg="var(--color-priority-low-bg)">
                      Текущая
                    </Badge>
                  </p>
                  <p className="text-[var(--color-ink-600)]">{currentSession ? format(new Date(currentSession.at), 'd MMM, HH:mm', { locale: ru }) : 'Сейчас'}</p>
                </div>
              </div>
              <p className="text-[var(--color-ink-400)]">Демо ограничено одним браузером — другие устройства здесь не появятся.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Безопасность</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1">
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs text-[var(--color-ink-900)] hover:bg-[var(--color-canvas)]"
              >
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                <span className="flex-1">Изменить пароль</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
              </button>

              <button
                type="button"
                onClick={toggleTwoFactor}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs text-[var(--color-ink-900)] hover:bg-[var(--color-canvas)]"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                <span className="flex-1">Двухфакторная аутентификация (2FA)</span>
                <span className={twoFactorEnabled ? 'font-medium text-[var(--color-priority-low)]' : 'text-[var(--color-ink-400)]'}>
                  {twoFactorEnabled ? 'Включена' : 'Выключена'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs text-[var(--color-ink-900)] hover:bg-[var(--color-canvas)]"
              >
                <History className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                <span className="flex-1">История входов</span>
                {historyOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-400)]" />
                )}
              </button>
              {historyOpen && (
                <div className="ml-5.5 space-y-1 border-l border-[var(--color-border)] pl-2.5">
                  {loginHistory.length === 0 && <p className="py-1 text-[var(--color-ink-400)]">Входов пока не было</p>}
                  {loginHistory.map((entry, i) => (
                    <p key={entry.at} className="py-0.5 text-[var(--color-ink-600)]">
                      {format(new Date(entry.at), 'd MMM, HH:mm', { locale: ru })} · {entry.device}
                      {i === 0 && <span className="text-[var(--color-priority-low)]"> · текущий</span>}
                    </p>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs font-medium text-[var(--color-priority-critical)] hover:bg-[var(--color-priority-critical-bg)]"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">Выйти со всех устройств</span>
              </button>
              <p className="flex items-center gap-1 pt-1 text-[10px] text-[var(--color-ink-400)]">
                <Shield className="h-3 w-3 shrink-0" />
                Пароль и 2FA хранятся только локально в браузере — учебный мок без бэкенда
              </p>
            </CardBody>
          </Card>
        </div>
      </main>

      {editOpen && <ProfileEditDrawer onClose={() => setEditOpen(false)} />}
      {passwordOpen && <ChangePasswordDrawer onClose={() => setPasswordOpen(false)} />}
    </>
  )
}
