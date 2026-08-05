import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Copy, Trash2, Plus, Loader2, CheckCircle2, Database } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { Switch } from '@/shared/ui/Switch'
import {
  useApiKeysQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
  useWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useIntegrationsQuery,
  useToggleIntegrationMutation,
} from '@/entities/integration'
import { useDbConnectionStore } from '@/entities/setting'

const WEBHOOK_EVENTS = ['order.created', 'order.completed', 'order.overdue', 'machine.down', 'conflict.detected']

export function IntegrationsTab() {
  const apiKeysQuery = useApiKeysQuery()
  const createKeyMutation = useCreateApiKeyMutation()
  const deleteKeyMutation = useDeleteApiKeyMutation()
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const webhooksQuery = useWebhooksQuery()
  const createWebhookMutation = useCreateWebhookMutation()
  const updateWebhookMutation = useUpdateWebhookMutation()
  const deleteWebhookMutation = useDeleteWebhookMutation()
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvent, setNewWebhookEvent] = useState(WEBHOOK_EVENTS[0]!)

  const integrationsQuery = useIntegrationsQuery()
  const toggleIntegrationMutation = useToggleIntegrationMutation()

  const dbConnection = useDbConnectionStore()
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok'>('idle')

  const handleCopy = (id: string, token: string) => {
    navigator.clipboard?.writeText(token).catch(() => {})
    setCopiedId(id)
    window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500)
  }

  const handleCreateKey = () => {
    if (!newKeyLabel.trim()) return
    createKeyMutation.mutate({ label: newKeyLabel.trim() }, { onSuccess: () => setNewKeyLabel('') })
  }

  const handleCreateWebhook = () => {
    if (!newWebhookUrl.trim()) return
    createWebhookMutation.mutate({ url: newWebhookUrl.trim(), event: newWebhookEvent }, { onSuccess: () => setNewWebhookUrl('') })
  }

  const handleTestConnection = () => {
    setTestStatus('testing')
    window.setTimeout(() => setTestStatus('ok'), 700)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>API-ключи</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Название ключа"
              className="h-9 flex-1 rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]"
            />
            <Button variant="secondary" onClick={handleCreateKey} disabled={!newKeyLabel.trim() || createKeyMutation.isPending}>
              {createKeyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Создать ключ
            </Button>
          </div>
          <div className="space-y-1.5">
            {(apiKeysQuery.data ?? []).map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs">
                <div>
                  <p className="font-medium text-[var(--color-ink-900)]">{key.label}</p>
                  <p className="font-mono text-[var(--color-ink-400)]">{key.tokenMasked}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(key.id, key.tokenMasked)} aria-label="Скопировать">
                    {copiedId === key.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteKeyMutation.mutate(key.id)} aria-label="Отозвать ключ">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Вебхуки</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              placeholder="https://example.com/hook"
              className="h-9 flex-1 rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]"
            />
            <select value={newWebhookEvent} onChange={(e) => setNewWebhookEvent(e.target.value)} className="h-9 rounded-lg border border-[var(--color-border)] px-2 text-sm">
              {WEBHOOK_EVENTS.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={handleCreateWebhook} disabled={!newWebhookUrl.trim() || createWebhookMutation.isPending}>
              {createWebhookMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Добавить
            </Button>
          </div>
          <div className="space-y-1.5">
            {(webhooksQuery.data ?? []).map((wh) => (
              <div key={wh.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[var(--color-ink-900)]">{wh.url}</p>
                  <p className="text-[var(--color-ink-400)]">{wh.event}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Switch checked={wh.enabled} onChange={(enabled) => updateWebhookMutation.mutate({ id: wh.id, enabled })} label="Включить вебхук" />
                  <Button variant="ghost" size="sm" onClick={() => deleteWebhookMutation.mutate(wh.id)} aria-label="Удалить вебхук">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Интеграции</CardTitle>
        </CardHeader>
        <CardBody className="space-y-1.5">
          {(integrationsQuery.data ?? []).map((integration) => (
            <div key={integration.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium text-[var(--color-ink-900)]">{integration.name}</p>
                <p className="text-xs text-[var(--color-ink-400)]">
                  {integration.description}
                  {integration.status === 'connected' && integration.connectedAt && ` · с ${format(new Date(integration.connectedAt), 'd MMMM yyyy', { locale: ru })}`}
                </p>
              </div>
              <Switch
                checked={integration.status === 'connected'}
                onChange={() => toggleIntegrationMutation.mutate(integration.id)}
                label={`Подключить ${integration.name}`}
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Базы данных</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-ink-600)]">
            <Database className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Демо-проект без реального бэкенда — проверка соединения имитирует сетевой запрос.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Хост
              <input
                value={dbConnection.host}
                onChange={(e) => dbConnection.setField({ host: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Порт
              <input
                type="number"
                value={dbConnection.port}
                onChange={(e) => dbConnection.setField({ port: Number(e.target.value) })}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              База данных
              <input
                value={dbConnection.database}
                onChange={(e) => dbConnection.setField({ database: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Пользователь
              <input
                value={dbConnection.user}
                onChange={(e) => dbConnection.setField({ user: e.target.value })}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
          </div>
          <Button variant="secondary" onClick={handleTestConnection} disabled={testStatus === 'testing'}>
            {testStatus === 'testing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Проверить соединение
          </Button>
          {testStatus === 'ok' && <p className="text-xs font-medium text-emerald-700">Соединение успешно установлено</p>}
        </CardBody>
      </Card>
    </div>
  )
}
