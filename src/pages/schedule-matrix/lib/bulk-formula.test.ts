import { describe, expect, it } from 'vitest'
import { applyBulkFormula } from './bulk-formula'

describe('applyBulkFormula', () => {
  it('увеличивает на процент и округляет вниз-вверх до ближайшей кратности упаковки', () => {
    // 200 шт. + 15% = 230, кратность 12 -> ближайшее кратное 12: 228 (19*12) vs 240 (20*12) -> 230 ближе к 228
    const result = applyBulkFormula({ currentQuantity: 200, packageMultiplicity: 12 }, { mode: 'relative', value: 15, roundToMultiplicity: true })
    expect(result).toBe(228)
  })

  it('без округления по кратности — просто целое число', () => {
    const result = applyBulkFormula({ currentQuantity: 200, packageMultiplicity: 12 }, { mode: 'relative', value: 15, roundToMultiplicity: false })
    expect(result).toBe(230)
  })

  it('абсолютный режим игнорирует текущее количество', () => {
    const result = applyBulkFormula({ currentQuantity: 999, packageMultiplicity: 10 }, { mode: 'absolute', value: 155, roundToMultiplicity: true })
    expect(result).toBe(160) // 155 -> ближайшее кратное 10: 160 (150 тоже кандидат, но 155 ровно посередине -> Math.round(15.5)=16 -> 160)
  })

  it('никогда не уходит в отрицательные значения', () => {
    const result = applyBulkFormula({ currentQuantity: 10, packageMultiplicity: 5 }, { mode: 'relative', value: -95, roundToMultiplicity: true })
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('нулевая кратность не ломает округление (просто целое)', () => {
    const result = applyBulkFormula({ currentQuantity: 50, packageMultiplicity: 0 }, { mode: 'relative', value: 10, roundToMultiplicity: true })
    expect(result).toBe(55)
  })
})
