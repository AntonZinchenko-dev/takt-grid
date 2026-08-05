import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { TopHeader } from '@/widgets/top-header'
import { Card } from '@/shared/ui/Card'
import { Pagination } from '@/shared/ui/Pagination'
import { useProductsQuery } from '@/entities/product'
import type { Product } from '@/entities/product'
import { useMachinesQuery } from '@/entities/machine'
import { cn } from '@/shared/lib/cn'
import { ProductDetailDrawer } from './ProductDetailDrawer'

const PAGE_SIZE = 15

export function CatalogPage() {
  const productsQuery = useProductsQuery()
  const machinesQuery = useMachinesQuery()
  const [editing, setEditing] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const location = useLocation()
  const handledLocationKeyRef = useRef<string | null>(null)

  const allProducts = productsQuery.data ?? []
  const pageProducts = allProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Название группы станков не хранится в техкарте (только slug machineGroupId) — берём человекочитаемое
  // имя с любого станка этой группы, ровно как MachinesPage строит groupOptions.
  const groupNameByGroupId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of machinesQuery.data ?? []) {
      if (!map.has(m.groupId)) map.set(m.groupId, m.groupName)
    }
    return map
  }, [machinesQuery.data])

  // Переход из глобального поиска в шапке — перейти на страницу продукта и подсветить строку.
  // Ключуем по location.key (не по data), иначе фоновый рефетч списка продуктов заново
  // прыгал бы на страницу и перезапускал подсветку спустя долгое время после перехода.
  useEffect(() => {
    const state = location.state as { highlightProductId?: string } | null
    if (!state?.highlightProductId || !productsQuery.data || handledLocationKeyRef.current === location.key) return
    handledLocationKeyRef.current = location.key
    setHighlightedId(state.highlightProductId)
    const index = productsQuery.data.findIndex((p) => p.id === state.highlightProductId)
    if (index !== -1) setPage(Math.floor(index / PAGE_SIZE) + 1)
    const timer = window.setTimeout(() => setHighlightedId(null), 2200)
    return () => window.clearTimeout(timer)
  }, [location.key, location.state, productsQuery.data])

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
                    <th className="px-4 py-2.5">Группа оборудования</th>
                    <th className="px-4 py-2.5 text-right">Темп, шт/ч</th>
                    <th className="px-4 py-2.5 text-right">Кратность упаковки</th>
                  </tr>
                </thead>
                <tbody>
                  {pageProducts.map((product) => (
                    <tr
                      key={product.id}
                      ref={(el) => {
                        if (product.id === highlightedId) el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                      }}
                      onClick={() => setEditing(product)}
                      className={cn(
                        'cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-canvas)]',
                        product.id === highlightedId && 'search-highlight',
                      )}
                    >
                      <td className="px-4 py-2.5 font-medium text-[var(--color-ink-900)]">{product.name}</td>
                      <td className="px-4 py-2.5 text-[var(--color-ink-600)]">{groupNameByGroupId.get(product.techMap.machineGroupId) ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">{product.techMap.outputPerHour}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">{product.techMap.packageMultiplicity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!productsQuery.isLoading && <Pagination page={page} pageSize={PAGE_SIZE} total={allProducts.length} onPageChange={setPage} />}
        </Card>
      </main>
      {editing && <ProductDetailDrawer product={editing} groupName={groupNameByGroupId.get(editing.techMap.machineGroupId) ?? '—'} onClose={() => setEditing(null)} />}
    </>
  )
}
