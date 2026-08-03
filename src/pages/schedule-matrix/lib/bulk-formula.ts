export type BulkEditMode = 'relative' | 'absolute'

export interface BulkFormulaInput {
  currentQuantity: number
  packageMultiplicity: number
}

export interface BulkFormulaParams {
  mode: BulkEditMode
  /** Для 'relative' — проценты (15 значит +15%). Для 'absolute' — итоговое количество. */
  value: number
  roundToMultiplicity: boolean
}

/**
 * Ядро Bulk Edit (см. ТЗ п.4.3). Округление — до БЛИЖАЙШЕЙ кратности упаковки,
 * а не вверх: план не должен неконтролируемо раздуваться при массовом применении
 * к сотням ячеек с разными продуктами/кратностями.
 */
export function applyBulkFormula(input: BulkFormulaInput, params: BulkFormulaParams): number {
  const raw = params.mode === 'relative' ? input.currentQuantity * (1 + params.value / 100) : params.value

  const multiplicity = input.packageMultiplicity
  const rounded = params.roundToMultiplicity && multiplicity > 0 ? Math.round(raw / multiplicity) * multiplicity : Math.round(raw)

  return Math.max(0, rounded)
}
