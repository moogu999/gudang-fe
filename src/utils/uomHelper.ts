import type { UomConversionLevel, PinnedUom } from '@/types'

/**
 * Convert a pinned UOM snapshot into UomConversionLevel[] so existing display helpers work on it.
 * Returns undefined when the snapshot is absent or has no levels.
 */
export function pinnedToLevels(pinned?: PinnedUom | null): UomConversionLevel[] | undefined {
  if (!pinned?.levels?.length) return undefined
  return pinned.levels.map((l) => ({
    id: 0,
    uomGroupId: pinned.uomGroupId,
    levelOrder: l.levelOrder,
    uomId: l.uomId,
    qtyPerParent: l.qtyPerParent,
    uom: { id: l.uomId, name: l.symbol, symbol: l.symbol },
  }))
}

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
  // Decompose by magnitude and re-apply the sign per tier, since JS's Math.floor/%
  // round toward -Infinity for negative operands (e.g. -3 → [-1,-1,-3] instead of
  // the sign-preserved [0,0,-3]) — return documents store fully negative quantities.
  const sign = baseQty < 0 ? -1 : 1
  const tiers: number[] = []
  let remaining = Math.round(Math.abs(baseQty))
  for (let i = 0; i < levels.length; i++) {
    let multiplier = 1
    for (let j = i + 1; j < levels.length; j++) {
      multiplier *= levels[j].qtyPerParent ?? 1
    }
    tiers.push(sign * Math.floor(remaining / multiplier))
    remaining = remaining % multiplier
  }
  return tiers
}
