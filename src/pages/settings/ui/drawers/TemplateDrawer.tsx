import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Drawer } from '@/shared/ui/Drawer'
import { Button } from '@/shared/ui/Button'
import { useUpdateNotificationTemplateMutation, type NotificationTemplate } from '@/entities/notification-setting'

interface TemplateDrawerProps {
  template: NotificationTemplate
  onClose: () => void
}

export function TemplateDrawer({ template, onClose }: TemplateDrawerProps) {
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const updateMutation = useUpdateNotificationTemplateMutation()

  const handleSave = () => {
    updateMutation.mutate({ id: template.id, subject, body })
  }

  return (
    <Drawer title={template.name} subtitle="Шаблоны сообщений" onClose={onClose}>
      <div className="space-y-3">
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-ink-600)]">
          Доступные переменные подставляются автоматически: <code>{'{{order_code}}'}</code>, <code>{'{{deadline}}'}</code>, <code>{'{{machine_name}}'}</code>.
        </p>
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Тема
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]"
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
          Текст сообщения
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mt-1 w-full resize-none rounded-lg border border-[var(--color-border)] px-2.5 py-2 text-sm outline-none focus:border-[var(--color-brand-500)]"
          />
        </label>
        <Button variant="primary" className="w-full" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Сохранить шаблон
        </Button>
        {updateMutation.isSuccess && <p className="text-xs font-medium text-emerald-700">Шаблон сохранён</p>}
      </div>
    </Drawer>
  )
}
