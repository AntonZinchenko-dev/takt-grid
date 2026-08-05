import { useState } from 'react'
import { Loader2, Mail, Bell, MessageSquare, Send } from 'lucide-react'
import { Card } from '@/shared/ui/Card'
import { Switch } from '@/shared/ui/Switch'
import { cn } from '@/shared/lib/cn'
import {
  useNotificationChannelsQuery,
  useUpdateNotificationChannelMutation,
  useNotificationRulesQuery,
  useUpdateNotificationRuleMutation,
  useNotificationTemplatesQuery,
  type NotificationChannel,
  type NotificationTemplate,
} from '@/entities/notification-setting'
import { TemplateDrawer } from '../drawers/TemplateDrawer'

const CHANNEL_ICON: Record<NotificationChannel['type'], typeof Mail> = { email: Mail, push: Bell, sms: MessageSquare, telegram: Send }

const SUBVIEWS = [
  { id: 'channels', label: 'Каналы' },
  { id: 'rules', label: 'Правила' },
  { id: 'templates', label: 'Шаблоны' },
] as const
type SubviewId = (typeof SUBVIEWS)[number]['id']

function ChannelRow({ channel }: { channel: NotificationChannel }) {
  const [target, setTarget] = useState(channel.target)
  const updateMutation = useUpdateNotificationChannelMutation()
  const Icon = CHANNEL_ICON[channel.type]

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-[var(--color-ink-400)]" />
      <span className="w-32 shrink-0 text-sm font-medium text-[var(--color-ink-900)]">{channel.name}</span>
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        onBlur={() => {
          if (target !== channel.target) updateMutation.mutate({ id: channel.id, target })
        }}
        className="h-8 flex-1 rounded-lg border border-[var(--color-border)] px-2.5 text-xs outline-none focus:border-[var(--color-brand-500)]"
      />
      <Switch checked={channel.enabled} onChange={(enabled) => updateMutation.mutate({ id: channel.id, enabled })} label={`Включить канал ${channel.name}`} />
    </div>
  )
}

export function NotificationsTab() {
  const [subview, setSubview] = useState<SubviewId>('channels')
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)

  const channelsQuery = useNotificationChannelsQuery()
  const rulesQuery = useNotificationRulesQuery()
  const templatesQuery = useNotificationTemplatesQuery()
  const updateRuleMutation = useUpdateNotificationRuleMutation()

  const toggleRuleChannel = (ruleId: string, channelIds: string[], channelId: string) => {
    const next = channelIds.includes(channelId) ? channelIds.filter((id) => id !== channelId) : [...channelIds, channelId]
    updateRuleMutation.mutate({ id: ruleId, channelIds: next })
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-[var(--color-canvas)] p-1">
        {SUBVIEWS.map((sv) => (
          <button
            key={sv.id}
            onClick={() => setSubview(sv.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              subview === sv.id ? 'bg-[var(--color-surface)] text-[var(--color-ink-900)] shadow-sm' : 'text-[var(--color-ink-600)]',
            )}
          >
            {sv.label}
          </button>
        ))}
      </div>

      {subview === 'channels' && (
        <Card>
          {channelsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {(channelsQuery.data ?? []).map((channel) => (
                <ChannelRow key={channel.id} channel={channel} />
              ))}
            </div>
          )}
        </Card>
      )}

      {subview === 'rules' && (
        <Card>
          {rulesQuery.isLoading || channelsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {(rulesQuery.data ?? []).map((rule) => (
                <div key={rule.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--color-ink-900)]">{rule.label}</span>
                    <Switch checked={rule.enabled} onChange={(enabled) => updateRuleMutation.mutate({ id: rule.id, enabled })} label={`Включить правило ${rule.label}`} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {(channelsQuery.data ?? []).map((channel) => (
                      <label key={channel.id} className="flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
                        <input
                          type="checkbox"
                          checked={rule.channelIds.includes(channel.id)}
                          onChange={() => toggleRuleChannel(rule.id, rule.channelIds, channel.id)}
                          className="h-3.5 w-3.5 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]"
                        />
                        {channel.name}
                      </label>
                    ))}
                    {rule.thresholdHours !== undefined && (
                      <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
                        Порог, ч
                        <input
                          type="number"
                          min={1}
                          max={72}
                          value={rule.thresholdHours}
                          onChange={(e) => updateRuleMutation.mutate({ id: rule.id, thresholdHours: Number(e.target.value) })}
                          className="h-7 w-16 rounded-lg border border-[var(--color-border)] px-2 text-xs"
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {subview === 'templates' && (
        <Card>
          {templatesQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {(templatesQuery.data ?? []).map((template) => (
                <button
                  key={template.id}
                  onClick={() => setEditingTemplate(template)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--color-canvas)]"
                >
                  <div>
                    <p className="font-medium text-[var(--color-ink-900)]">{template.name}</p>
                    <p className="text-xs text-[var(--color-ink-400)]">{template.subject}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {editingTemplate && <TemplateDrawer template={editingTemplate} onClose={() => setEditingTemplate(null)} />}
    </div>
  )
}
