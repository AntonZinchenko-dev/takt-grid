export interface TechMap {
  id: string
  productId: string
  /** Требуемая группа станков (см. Machine.groupId) */
  machineGroupId: string
  /** Темп выпуска на станке этой группы, шт/час */
  outputPerHour: number
  /** Кратность упаковки — на неё округляются значения в Bulk Edit (см. ТЗ п.4.3) */
  packageMultiplicity: number
}

export interface Product {
  id: string
  name: string
  techMap: TechMap
}
