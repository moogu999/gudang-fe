/** An invoice line ticked in the manifest picker. Amounts are unsigned numbers at the UI boundary only. */
export interface PickedInvoiceLine {
  invoiceId: number
  invoiceNo: string
  customerName: string
  /** The invoice total, snapshotted on save as `referenceAmount`. */
  totalAmount: number
  /** What is still depositable on this invoice — the clamp for `amount`. */
  remainingAmount: number
  amount: number
}

export interface AdhocRow {
  _key: string
  customerId?: number
  /** Display copy of the chosen customer, so the select can label it without a fetch. */
  customer?: { id: number; name: string }
  categoryId?: number
  category?: { id: number; name: string }
  note: string
  amount: number
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function clamp(value: number | null | undefined, max: number): number {
  let amount = value ?? 0
  if (amount < 0) amount = 0
  if (amount > max) amount = max
  return amount
}

/** Ad-hoc lines need a customer, a category and a positive amount. */
export function adhocRowErrors(row: AdhocRow): {
  outlet: boolean
  category: boolean
  amount: boolean
} {
  return {
    outlet: row.customerId == null,
    category: row.categoryId == null,
    amount: !(row.amount > 0),
  }
}

export function isAdhocRowValid(row: AdhocRow): boolean {
  const e = adhocRowErrors(row)
  return !e.outlet && !e.category && !e.amount
}

export function newAdhocRow(): AdhocRow {
  return { _key: crypto.randomUUID(), note: '', amount: 0 }
}

/** Lunas when the whole remaining amount is deposited, Partial for anything less (but above zero). */
export function lineStatus(amount: number, remaining: number): 'paid' | 'partial' | null {
  if (amount <= 0) return null
  return round2(amount) >= round2(remaining) ? 'paid' : 'partial'
}
