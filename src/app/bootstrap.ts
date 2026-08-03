/**
 * У продукта нет реального бэкенда (см. ТЗ — "пока с MSW"), поэтому воркер
 * поднимается безусловно, а не только в dev. В реальном проекте здесь была бы
 * ветка `if (import.meta.env.DEV)` и переключение на настоящий API_BASE_URL.
 */
export async function enableMocking(): Promise<void> {
  const { worker } = await import('@/app/mocks')
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
