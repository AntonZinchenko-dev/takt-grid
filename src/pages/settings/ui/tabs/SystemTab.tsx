import { useRef, useState, type ChangeEvent } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Download, Upload, Loader2, Archive, Trash2, RotateCcw } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { useMachinesQuery, useCreateMachineMutation, type Machine } from '@/entities/machine'
import { useTeamMembersQuery, useCreateTeamMemberMutation, type TeamMember } from '@/entities/user'
import { useSystemSettingsStore, useBackupsStore, type DateFormat, type Units } from '@/entities/setting'
import { useRestoreBackupMutation } from '../../model/use-restore-backup-mutation'

interface ExportPayload {
  machines: Machine[]
  teamMembers: TeamMember[]
  exportedAt: string
}

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'dd.MM.yyyy', label: 'ДД.ММ.ГГГГ' },
  { value: 'yyyy-MM-dd', label: 'ГГГГ-ММ-ДД' },
  { value: 'MM/dd/yyyy', label: 'ММ/ДД/ГГГГ' },
]

const UNITS: { value: Units; label: string }[] = [
  { value: 'metric', label: 'Метрическая (кг, м, шт/ч)' },
  { value: 'imperial', label: 'Имперская (lb, ft, шт/смену)' },
]

export function SystemTab() {
  const systemSettings = useSystemSettingsStore()
  const machinesQuery = useMachinesQuery()
  const teamMembersQuery = useTeamMembersQuery()
  const createMachineMutation = useCreateMachineMutation()
  const createMemberMutation = useCreateTeamMemberMutation()
  const restoreMutation = useRestoreBackupMutation()
  const { backups, addBackup, removeBackup } = useBackupsStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importPreview, setImportPreview] = useState<ExportPayload | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [backupLabel, setBackupLabel] = useState('')
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const handleExport = () => {
    const payload: ExportPayload = { machines: machinesQuery.data ?? [], teamMembers: teamMembersQuery.data ?? [], exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taktgrid-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportResult(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<ExportPayload>
      if (!Array.isArray(parsed.machines) && !Array.isArray(parsed.teamMembers)) {
        throw new Error('Файл не похож на экспорт TaktGrid — ожидаются поля machines/teamMembers')
      }
      setImportPreview({ machines: parsed.machines ?? [], teamMembers: parsed.teamMembers ?? [], exportedAt: parsed.exportedAt ?? '' })
    } catch (err) {
      setImportPreview(null)
      setImportError(err instanceof Error ? err.message : 'Не удалось прочитать файл')
    }
  }

  const handleApplyImport = async () => {
    if (!importPreview) return
    setImporting(true)
    let created = 0
    for (const machine of importPreview.machines) {
      await createMachineMutation.mutateAsync({ name: machine.name, workshopId: machine.workshopId, groupId: machine.groupId, groupName: machine.groupName, capacityPerHour: machine.capacityPerHour })
      created += 1
    }
    for (const member of importPreview.teamMembers) {
      await createMemberMutation.mutateAsync({ name: member.name, email: member.email, phone: member.phone, roleId: member.roleId, groupIds: member.groupIds, status: member.status })
      created += 1
    }
    setImporting(false)
    setImportResult(`Импортировано записей: ${created}`)
    setImportPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreateBackup = () => {
    const payload: ExportPayload = { machines: machinesQuery.data ?? [], teamMembers: teamMembersQuery.data ?? [], exportedAt: new Date().toISOString() }
    addBackup({
      id: `backup-${Date.now()}`,
      label: backupLabel.trim() || `Копия от ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: ru })}`,
      createdAt: new Date().toISOString(),
      payload,
    })
    setBackupLabel('')
  }

  const handleRestore = (backupId: string, payload: unknown) => {
    setRestoringId(backupId)
    const data = payload as ExportPayload
    restoreMutation.mutate(
      { machines: data.machines, teamMembers: data.teamMembers },
      { onSettled: () => setRestoringId(null) },
    )
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Общие настройки</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Формат даты
              <select
                value={systemSettings.dateFormat}
                onChange={(e) => systemSettings.setDateFormat(e.target.value as DateFormat)}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[var(--color-ink-900)]">
              Единицы измерения
              <select
                value={systemSettings.units}
                onChange={(e) => systemSettings.setUnits(e.target.value as Units)}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-[var(--color-ink-600)]">
            Предпросмотр текущей даты: <span className="font-medium text-[var(--color-ink-900)]">{format(new Date(), systemSettings.dateFormat)}</span>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Импорт/экспорт</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs text-[var(--color-ink-600)]">Экспортируются станки и сотрудники. Импорт принимает файл в том же формате и добавляет записи из него.</p>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Экспортировать данные (JSON)
          </Button>

          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="text-xs" />
            {importError && <p className="mt-2 text-xs font-medium text-red-600">{importError}</p>}
            {importPreview && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-[var(--color-ink-600)]">
                  В файле: {importPreview.machines.length} станков, {importPreview.teamMembers.length} сотрудников.
                </p>
                <Button variant="primary" size="sm" onClick={handleApplyImport} disabled={importing}>
                  {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Upload className="h-3.5 w-3.5" />
                  Применить импорт
                </Button>
              </div>
            )}
            {importResult && <p className="mt-2 text-xs font-medium text-emerald-700">{importResult}</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Резервное копирование</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <input
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              placeholder="Название копии (необязательно)"
              className="h-9 flex-1 rounded-lg border border-[var(--color-border)] px-2.5 text-sm outline-none focus:border-[var(--color-brand-500)]"
            />
            <Button variant="secondary" onClick={handleCreateBackup}>
              <Archive className="h-3.5 w-3.5" />
              Создать копию
            </Button>
          </div>

          <div className="space-y-1.5">
            {backups.length === 0 && <p className="text-xs text-[var(--color-ink-400)]">Резервных копий пока нет</p>}
            {backups.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs">
                <div>
                  <p className="font-medium text-[var(--color-ink-900)]">{b.label}</p>
                  <p className="text-[var(--color-ink-400)]">{format(new Date(b.createdAt), 'd MMMM yyyy, HH:mm', { locale: ru })}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => handleRestore(b.id, b.payload)} disabled={restoringId === b.id}>
                    {restoringId === b.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Восстановить
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeBackup(b.id)} aria-label="Удалить копию">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {restoreMutation.isSuccess && <p className="text-xs font-medium text-emerald-700">Данные восстановлены из копии</p>}
        </CardBody>
      </Card>
    </div>
  )
}
