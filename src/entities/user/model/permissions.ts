import type { Permission } from './types'

/** Источник истины для прав доступа — используется и вкладкой "Роли и права", и карточкой "Роли и доступ" на Профиле. */
export const PERMISSIONS: Permission[] = [
  { key: 'planning', label: 'Планирование' },
  { key: 'bulk_edit', label: 'Bulk Edit' },
  { key: 'analytics', label: 'Просмотр аналитики' },
  { key: 'export', label: 'Экспорт данных' },
  { key: 'machines', label: 'Управление оборудованием' },
  { key: 'users', label: 'Управление пользователями' },
  { key: 'settings', label: 'Настройки предприятия' },
]
