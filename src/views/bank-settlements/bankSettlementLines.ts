import dayjs from 'dayjs'
import type { ClearedGiro, GiroClearingCandidate } from '@/types/bankSettlement.type'

export interface MutationRow {
  _key: string
  mutationDate: Date | null
  description: string
  amount: number | null
  customerId?: number
  /** Display copy of the chosen customer, so the select can label it without a fetch. */
  customer?: { id: number; name: string; code?: string }
  /** The giro clearing batch this credit settles — an alternative to a customer, never both. */
  giroClearingId?: number
  /** Display copy of the batch number, so a saved link labels itself without a candidate. */
  giroClearingNo?: string
  note: string | null
}

export type TagMode = 'customer' | 'giro'

export type DateError = 'required' | 'outOfPeriod'

export interface MutationRowErrors {
  date?: DateError
  description?: true
  amount?: true
}

export type Period = [Date, Date]

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function newMutationRow(): MutationRow {
  return {
    _key: crypto.randomUUID(),
    mutationDate: null,
    description: '',
    amount: null,
    note: null,
  }
}

/** Credit lines only, so amount > 0. The date must sit inside the header period (inclusive). */
export function rowErrors(row: MutationRow, period: Period | null): MutationRowErrors {
  const errors: MutationRowErrors = {}
  if (!row.mutationDate) {
    errors.date = 'required'
  } else if (
    period &&
    (dayjs(row.mutationDate).isBefore(period[0], 'day') ||
      dayjs(row.mutationDate).isAfter(period[1], 'day'))
  ) {
    errors.date = 'outOfPeriod'
  }
  if (!row.description.trim()) errors.description = true
  if (row.amount == null || !(row.amount > 0)) errors.amount = true
  return errors
}

export function isRowValid(row: MutationRow, period: Period | null): boolean {
  return Object.keys(rowErrors(row, period)).length === 0
}

/**
 * "Untagged" is the absence of a customer — or of a giro clearing batch. A batch-linked line stays
 * on the completed settlement but is never poolable.
 */
export function isTagged(row: MutationRow): boolean {
  return row.customerId != null || row.giroClearingId != null
}

/** Which tag a row carries; `none` when it's untagged. */
export function tagMode(row: MutationRow): TagMode | 'none' {
  if (row.giroClearingId != null) return 'giro'
  if (row.customerId != null) return 'customer'
  return 'none'
}

/** The giro look-alike warning looks this far either side of the mutation date. */
export const LOOKALIKE_WINDOW_DAYS = 7

/**
 * A credit tagged to a *customer* that looks like one of that customer's cleared giros on
 * this account (same amount, cleared within ±7 days). Tagging it to the customer would count
 * the money twice — once through the giro, once through the bank line. Warned, never blocked.
 */
export function giroLookalike(
  row: MutationRow,
  candidates: GiroClearingCandidate[],
): (ClearedGiro & { clearingId: number; clearingNo: string }) | undefined {
  if (row.customerId == null || row.amount == null || !row.mutationDate) return undefined
  const amount = round2(row.amount)
  for (const batch of candidates) {
    for (const giro of batch.clearedGiros) {
      if (giro.customerId !== row.customerId) continue
      if (round2(parseFloat(giro.amount) || 0) !== amount) continue
      const days = Math.abs(dayjs(giro.clearedDate.slice(0, 10)).diff(row.mutationDate, 'day'))
      if (days > LOOKALIKE_WINDOW_DAYS) continue
      return { ...giro, clearingId: batch.id, clearingNo: batch.no }
    }
  }
  return undefined
}

export interface OverMatch {
  id: number
  no: string
  linked: number
  unmatched: number
}

/** Batches whose linked lines add up to more than their unmatched cleared amount. */
export function batchOverMatch(
  rows: MutationRow[],
  candidates: GiroClearingCandidate[],
): OverMatch[] {
  const linked = new Map<number, number>()
  for (const row of rows) {
    if (row.giroClearingId == null) continue
    linked.set(row.giroClearingId, (linked.get(row.giroClearingId) ?? 0) + (row.amount ?? 0))
  }
  const over: OverMatch[] = []
  for (const batch of candidates) {
    const sum = round2(linked.get(batch.id) ?? 0)
    const unmatched = round2(parseFloat(batch.unmatchedAmount) || 0)
    if (sum > unmatched) over.push({ id: batch.id, no: batch.no, linked: sum, unmatched })
  }
  return over
}

export function partition(rows: MutationRow[]): { tagged: MutationRow[]; untagged: MutationRow[] } {
  return {
    tagged: rows.filter(isTagged),
    untagged: rows.filter((r) => !isTagged(r)),
  }
}

export function totals(rows: MutationRow[]): { total: number; tagged: number; untagged: number } {
  let tagged = 0
  let untagged = 0
  for (const row of rows) {
    if (isTagged(row)) tagged += row.amount ?? 0
    else untagged += row.amount ?? 0
  }
  return { total: round2(tagged + untagged), tagged: round2(tagged), untagged: round2(untagged) }
}
