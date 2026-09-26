import type { ArCashSourceType, ArOpenItem, ArUnappliedCashItem } from '@/types/arClearing.type'
import { round2 } from '@/views/bank-settlements/bankSettlementLines'

export { round2 }

export interface SourceRow extends ArUnappliedCashItem {
  _key: string
}

export interface AllocationRow extends Omit<ArOpenItem, 'ageDays'> {
  /** Null on a saved document, whose allocation snapshot carries no invoice age. */
  ageDays: number | null
  /** What the operator (or auto-allocate) is applying to this invoice. */
  allocated: number
}

/** `sourceLineId` is unique only within a `sourceType`, so a source is always keyed on the pair. */
export const keyOf = (type: ArCashSourceType, id: number) => `${type}:${id}`

export function toSourceRow(item: ArUnappliedCashItem): SourceRow {
  return { ...item, _key: keyOf(item.sourceType, item.sourceLineId) }
}

export function toAllocationRow(item: ArOpenItem, allocated = 0): AllocationRow {
  return { ...item, allocated }
}

const num = (value: string | number | null | undefined) => parseFloat(String(value ?? '')) || 0
const cents = (value: number) => Math.round(value * 100)

export function totals(
  picked: SourceRow[],
  rows: AllocationRow[],
): { available: number; allocated: number; unallocated: number } {
  const available = cents(picked.reduce((sum, s) => sum + num(s.unappliedAmount), 0))
  const allocated = cents(rows.reduce((sum, r) => sum + r.allocated, 0))
  return {
    available: available / 100,
    allocated: allocated / 100,
    unallocated: (available - allocated) / 100,
  }
}

/**
 * Source hints first, then FIFO.
 *
 * Pass 1: every picked cash-deposit source whose `hintInvoiceId` is present in `rows` pays that
 * invoice first, up to the smaller of the source remainder and the invoice's outstanding. This
 * respects what the collector actually reported.
 * Pass 2: whatever pool is left spreads over the rows sorted by `documentDate` ascending, then
 * `documentId`, filling each to its outstanding.
 *
 * Returns a fresh array and never mutates its inputs. Advisory only — the server re-snapshots
 * and re-clamps everything on submit. Works in integer cents to keep the sums exact.
 */
export function autoAllocate(picked: SourceRow[], rows: AllocationRow[]): AllocationRow[] {
  const room = new Map<number, number>()
  const given = new Map<number, number>()
  for (const r of rows) {
    room.set(r.documentId, cents(num(r.outstandingAmount)))
    given.set(r.documentId, 0)
  }

  let pool = picked.reduce((sum, s) => sum + cents(num(s.unappliedAmount)), 0)

  const give = (invoiceId: number, want: number) => {
    const amount = Math.max(0, Math.min(want, room.get(invoiceId) ?? 0))
    room.set(invoiceId, (room.get(invoiceId) ?? 0) - amount)
    given.set(invoiceId, (given.get(invoiceId) ?? 0) + amount)
    return amount
  }

  for (const source of picked) {
    if (source.sourceType !== 'cash_deposit' || source.hintInvoiceId == null) continue
    if (!room.has(source.hintInvoiceId)) continue
    pool -= give(source.hintInvoiceId, cents(num(source.unappliedAmount)))
  }

  const fifo = [...rows].sort(
    (a, b) => a.documentDate.localeCompare(b.documentDate) || a.documentId - b.documentId,
  )
  for (const r of fifo) {
    if (pool <= 0) break
    pool -= give(r.documentId, pool)
  }

  return rows.map((r) => ({ ...r, allocated: (given.get(r.documentId) ?? 0) / 100 }))
}

/** Ok ≤ 14 days, warn 15–59, danger ≥ 60. */
export function agingSeverity(ageDays: number): 'ok' | 'warn' | 'danger' {
  if (ageDays >= 60) return 'danger'
  if (ageDays >= 15) return 'warn'
  return 'ok'
}

export function allocationState(row: AllocationRow): 'none' | 'partial' | 'full' {
  const allocated = cents(row.allocated)
  if (allocated <= 0) return 'none'
  return allocated >= cents(num(row.outstandingAmount)) ? 'full' : 'partial'
}
