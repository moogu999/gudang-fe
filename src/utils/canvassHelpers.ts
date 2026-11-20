import type { PinnedUom } from '@/types'
import type { CanvassLoadingLine, CanvassLoadingStatus } from '@/types/canvassLoading.type'
import type { CanvassUnloadingStatus } from '@/types/canvassUnloading.type'
import { decomposeBaseQty, pinnedToLevels } from '@/utils/uomHelper'

/** Parses a decimal string from the API; an absent or malformed value reads as 0. */
export function toQty(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '')
  return Number.isFinite(n) ? n : 0
}

/** Serializes a quantity for the API, trimming float noise but keeping up to 4 decimals. */
export function qtyToString(value: number): string {
  return String(Math.round(value * 10000) / 10000)
}

/**
 * Renders a base-UOM quantity the way the document is read on the floor:
 * "2 / 5" (CTN / PCS) for a multi-level UOM group, a plain number otherwise.
 */
export function formatBaseQty(
  value: string | number | null | undefined,
  pinned?: PinnedUom | null,
): string {
  const qty = toQty(value)
  const levels = pinnedToLevels(pinned)
  if ((levels?.length ?? 0) > 1) return decomposeBaseQty(qty, levels!).join(' / ')
  return qty.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

/** The UOM symbols of a pinned group, e.g. "CTN / PCS"; empty when there are none. */
export function uomLabel(pinned?: PinnedUom | null): string {
  if (!pinned?.levels?.length) return ''
  return pinned.levels.map((l) => l.symbol).join(' / ')
}

export type LineChange = 'new' | 'changed' | null

/**
 * How a loading line differs from the previous revision: `new` for a product the
 * previous revision did not carry, `changed` for another quantity, `null` when
 * nothing moved (or the loading is still on its first revision).
 */
export function lineChange(
  line: Pick<CanvassLoadingLine, 'changed' | 'previousQuantity'>,
): LineChange {
  if (!line.changed) return null
  return line.previousQuantity === undefined ? 'new' : 'changed'
}

/** Expected less returned, never negative: the "Selisih" of an unloading line. */
export function unloadingShortage(
  expected: string | number | null | undefined,
  returned: string | number | null | undefined,
): number {
  return Math.max(0, toQty(expected) - toQty(returned))
}

export function loadingStatusSeverity(
  status: CanvassLoadingStatus,
): 'secondary' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'sent':
      return 'info'
    case 'rejected':
      return 'danger'
    case 'confirmed':
      return 'success'
    case 'cancelled':
      return 'warn'
    default:
      return 'secondary'
  }
}

export function unloadingStatusSeverity(
  status: CanvassUnloadingStatus,
): 'secondary' | 'success' | 'warn' {
  if (status === 'posted') return 'success'
  if (status === 'cancelled') return 'warn'
  return 'secondary'
}
