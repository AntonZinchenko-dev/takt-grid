/**
 * Одноразовые ссылки на конкретную запись (заказ/станок/продукт), которые открывают что-то
 * (карточку/подсветку) на целевой странице. Через query-параметры, а не location.state:
 * state браузер хранит в истории и он переживает обновление страницы (F5), а компонентный
 * ref "уже обработано" — нет, из-за чего действие раньше повторялось после каждого reload.
 * Целевая страница сама вычищает свой параметр из URL сразу после применения (setSearchParams
 * ..., { replace: true }) — см. SchedulePage/MachinesPage/CatalogPage.
 */

export function orderDeepLink(orderId: string, deadlineIso: string): string {
  return `/matrix?highlightOrder=${encodeURIComponent(orderId)}&jump=${encodeURIComponent(deadlineIso)}`
}

export function machineDeepLink(machineId: string): string {
  return `/machines?openMachine=${encodeURIComponent(machineId)}`
}

export function productDeepLink(productId: string): string {
  return `/catalog?highlightProduct=${encodeURIComponent(productId)}`
}

/** Просто прыжок матрицы к дате, без открытия карточки — например, из "Быстрых фильтров" дашборда. */
export function matrixJumpLink(iso: string, zoom?: 'hour' | 'day' | 'week'): string {
  const params = new URLSearchParams({ jump: iso })
  if (zoom) params.set('zoom', zoom)
  return `/matrix?${params.toString()}`
}
