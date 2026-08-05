import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Switch } from '@/shared/ui/Switch'
import { Badge } from '@/shared/ui/Badge'
import { usePasswordPolicyStore, useTwoFaPolicyStore } from '@/entities/setting'
import { useRolesQuery } from '@/entities/user'
import { useAuthStore } from '@/entities/session'

export function SecurityTab() {
  const policy = usePasswordPolicyStore()
  const twoFaPolicy = useTwoFaPolicyStore()
  const rolesQuery = useRolesQuery()
  const loginHistory = useAuthStore((s) => s.loginHistory)
  const twoFactorEnabled = useAuthStore((s) => s.twoFactorEnabled)
  const currentSession = loginHistory[0]

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Политика паролей</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Минимальная длина
              <input
                type="number"
                min={4}
                max={32}
                value={policy.minLength}
                onChange={(e) => policy.setPolicy({ minLength: Number(e.target.value) })}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Срок действия пароля, дней
              <input
                type="number"
                min={0}
                max={365}
                value={policy.expiryDays}
                onChange={(e) => policy.setPolicy({ expiryDays: Number(e.target.value) })}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
          </div>
          {(
            [
              ['requireUppercase', 'Требовать заглавную букву'],
              ['requireDigit', 'Требовать цифру'],
              ['requireSymbol', 'Требовать спецсимвол'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
              <span className="text-sm text-[var(--color-ink-900)]">{label}</span>
              <Switch checked={policy[key]} onChange={(value) => policy.setPolicy({ [key]: value })} label={label} />
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Двухфакторная аутентификация</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          <p className="text-xs text-[var(--color-ink-600)]">Обязательна для ролей:</p>
          {(rolesQuery.data ?? []).map((role) => (
            <label key={role.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
              <Badge color={role.color} bg={role.bg}>
                {role.name}
              </Badge>
              <Switch checked={twoFaPolicy.enforceForRoleIds.includes(role.id)} onChange={() => twoFaPolicy.toggleRole(role.id)} label={`Обязательна для роли ${role.name}`} />
            </label>
          ))}
          <p className="pt-1 text-xs text-[var(--color-ink-400)]">
            Ваша учётная запись: 2FA сейчас {twoFactorEnabled ? 'включена' : 'выключена'} — изменить можно в{' '}
            <Link to="/profile" className="font-medium text-[var(--color-brand-600)] hover:underline">
              профиле
            </Link>
            .
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Сессии</CardTitle>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <div className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5">
            <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-ink-400)]" />
            <div>
              <p className="flex items-center gap-1.5 font-medium text-[var(--color-ink-900)]">
                {currentSession?.device ?? 'Этот браузер'}
                <Badge color="var(--color-priority-low)" bg="var(--color-priority-low-bg)">
                  Текущая
                </Badge>
              </p>
              <p className="text-xs text-[var(--color-ink-600)]">{currentSession ? format(new Date(currentSession.at), 'd MMMM, HH:mm', { locale: ru }) : 'Сейчас'}</p>
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-400)]">Демо ограничено одним браузером — управление сессиями других устройств здесь не появится.</p>
        </CardBody>
      </Card>
    </div>
  )
}
