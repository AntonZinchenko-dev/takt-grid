import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { X, Loader2, Printer } from 'lucide-react'
import { useUpdateTechMapMutation, type Product } from '@/entities/product'
import { Button } from '@/shared/ui/Button'

interface ProductDetailDrawerProps {
  product: Product
  groupName: string
  onClose: () => void
}

/** Время на партию из заданного темпа выпуска, чтобы ТЗ выглядело как реальный документ, а не голые цифры техкарты. */
function batchTimeLabel(quantity: number, outputPerHour: number): string {
  if (outputPerHour <= 0) return '—'
  const totalMinutes = Math.round((quantity / outputPerHour) * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} мин`
  return `${h} ч ${String(m).padStart(2, '0')} мин`
}

const SAMPLE_BATCH_SIZES = [100, 500, 1000]

export function ProductDetailDrawer({ product, groupName, onClose }: ProductDetailDrawerProps) {
  const [outputPerHour, setOutputPerHour] = useState(product.techMap.outputPerHour)
  const [packageMultiplicity, setPackageMultiplicity] = useState(product.techMap.packageMultiplicity)
  const mutation = useUpdateTechMapMutation()

  const docNumber = product.techMap.id.toUpperCase()
  const today = new Date()

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 print:hidden" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl print:max-w-none print:border-0 print:shadow-none">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 print:hidden">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{product.name}</h2>
            <p className="text-xs text-[var(--color-ink-600)]">{groupName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Печать ТЗ
            </Button>
            <button onClick={onClose} aria-label="Закрыть" className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="print-area space-y-5 px-5 py-4">
          {/* Печатная шапка документа — на экране скрыта, в остальном верстка общая с формой редактирования ниже. */}
          <div className="hidden print:block">
            <div className="mb-3 flex items-start justify-between border-b border-[var(--color-ink-900)] pb-3">
              <div>
                <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Техническое задание на производство</h1>
                <p className="text-sm text-[var(--color-ink-600)]">{product.name}</p>
              </div>
              <div className="text-right text-xs text-[var(--color-ink-600)]">
                <p>№ {docNumber}</p>
                <p>от {format(today, 'd MMMM yyyy', { locale: ru })}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-xs print:bg-transparent">
            <div>
              <p className="text-[var(--color-ink-400)]">Наименование продукции</p>
              <p className="font-medium text-[var(--color-ink-900)]">{product.name}</p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Требуемая группа оборудования</p>
              <p className="font-medium text-[var(--color-ink-900)]">{groupName}</p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Темп производства</p>
              <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{outputPerHour} шт/ч</p>
            </div>
            <div>
              <p className="text-[var(--color-ink-400)]">Кратность упаковки</p>
              <p className="font-medium tabular-nums text-[var(--color-ink-900)]">{packageMultiplicity} шт</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-900)]">Расчётное время на партию</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-ink-600)]">
                  <th className="py-1.5 pr-3 font-medium">Размер партии, шт</th>
                  <th className="py-1.5 font-medium">Время изготовления</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_BATCH_SIZES.map((qty) => (
                  <tr key={qty} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-1.5 pr-3 tabular-nums text-[var(--color-ink-900)]">{qty}</td>
                    <td className="py-1.5 tabular-nums text-[var(--color-ink-600)]">{batchTimeLabel(qty, outputPerHour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 print:hidden">
            <p className="text-xs font-semibold text-[var(--color-ink-900)]">Редактировать техкарту</p>
            <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
              Темп производства, шт/ч
              <input
                type="number"
                min={1}
                value={outputPerHour}
                onChange={(e) => setOutputPerHour(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
              Кратность упаковки, шт
              <input
                type="number"
                min={1}
                value={packageMultiplicity}
                onChange={(e) => setPackageMultiplicity(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
              />
            </label>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => mutation.mutate({ productId: product.id, outputPerHour, packageMultiplicity })}
              disabled={mutation.isPending || outputPerHour <= 0 || packageMultiplicity <= 0}
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Сохранить
            </Button>
            {mutation.isSuccess && <p className="text-xs font-medium text-emerald-700">Изменения сохранены</p>}
          </div>

          <div className="hidden gap-6 pt-8 text-xs text-[var(--color-ink-900)] print:grid print:grid-cols-3">
            {['Разработал', 'Проверил', 'Утвердил'].map((role) => (
              <div key={role}>
                <p className="mb-6">{role}: _____________________</p>
                <p>Дата: _____________</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
