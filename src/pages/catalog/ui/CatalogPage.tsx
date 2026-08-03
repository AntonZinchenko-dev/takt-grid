import { useState } from 'react'
import { Loader2, Pencil, X } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { useProductsQuery, useUpdateTechMapMutation } from '@/entities/product'
import type { Product } from '@/entities/product'

function EditTechMapDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const [outputPerHour, setOutputPerHour] = useState(product.techMap.outputPerHour)
  const [packageMultiplicity, setPackageMultiplicity] = useState(product.techMap.packageMultiplicity)
  const mutation = useUpdateTechMapMutation()

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--color-ink-900)]">{product.name}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-600)] hover:bg-[var(--color-canvas)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
            Темп производства, шт/ч
            <input
              type="number"
              value={outputPerHour}
              onChange={(e) => setOutputPerHour(Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--color-ink-900)]">
            Кратность упаковки, шт
            <input
              type="number"
              value={packageMultiplicity}
              onChange={(e) => setPackageMultiplicity(Number(e.target.value))}
              className="mt-1 h-9 w-full rounded-lg border border-[var(--color-border)] px-2.5 text-sm"
            />
          </label>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => mutation.mutate({ productId: product.id, outputPerHour, packageMultiplicity }, { onSuccess: onClose })}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CatalogPage() {
  const productsQuery = useProductsQuery()
  const [editing, setEditing] = useState<Product | null>(null)

  return (
    <>
      <TopHeader title="Продукция и техкарты" subtitle="Каталог продуктов и параметры техкарт" />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          {productsQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-ink-400)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium text-[var(--color-ink-600)]">
                    <th className="px-4 py-2.5">Продукт</th>
                    <th className="px-4 py-2.5 text-right">Темп, шт/ч</th>
                    <th className="px-4 py-2.5 text-right">Кратность упаковки</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {(productsQuery.data ?? []).map((product) => (
                    <tr key={product.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-canvas)]">
                      <td className="px-4 py-2.5 font-medium text-[var(--color-ink-900)]">{product.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">{product.techMap.outputPerHour}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">{product.techMap.packageMultiplicity}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="ghost" aria-label={`Редактировать техкарту «${product.name}»`} onClick={() => setEditing(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
      {editing && <EditTechMapDrawer product={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
