import type { UomConversionLevel } from '@/types'

/**
 * Convert tier values (e.g. [1, 0, 1]) to base unit total (e.g. 121).
 *
 * Example: levels = [Box(null), Pack(10), Piece(12)], tiers = [1, 0, 1]
 *   → 1×120 + 0×12 + 1×1 = 121
 */
export function computeBaseQty(tiers: number[], levels: UomConversionLevel[]): number {
  let baseQty = 0
  for (let i = 0; i < levels.length; i++) {
    let multiplier = 1
    for (let j = i + 1; j < levels.length; j++) {
      multiplier *= levels[j].qtyPerParent ?? 1
    }
    baseQty += (tiers[i] || 0) * multiplier
  }
  return baseQty
}

/**
 * Decompose base unit total (e.g. 121) back into tier values (e.g. [1, 0, 1]).
 *
 * Example: levels = [Box(null), Pack(10), Piece(12)], baseQty = 121
 *   → 121 ÷ 120 = 1 rem 1 → 1 ÷ 12 = 0 rem 1 → 1 ÷ 1 = 1
 *   → [1, 0, 1]
 */
export function decomposeBaseQty(baseQty: number, levels: UomConversionLevel[]): number[] {
  const tiers: number[] = []
  let remaining = Math.round(baseQty)
  for (let i = 0; i < levels.length; i++) {
    let multiplier = 1
    for (let j = i + 1; j < levels.length; j++) {
      multiplier *= levels[j].qtyPerParent ?? 1
    }
    tiers.push(Math.floor(remaining / multiplier))
    remaining = remaining % multiplier
  }
  return tiers
}
