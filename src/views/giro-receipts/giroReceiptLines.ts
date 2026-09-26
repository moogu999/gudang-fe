import dayjs from 'dayjs'
import type { GiroLineRequest, GiroStatus } from '@/types/giroReceipt.type'

/** One physical giro as edited in the receipt's table. Amounts are numbers at the UI boundary only. */
export interface GiroRow {
  _key: string
  giroNo: string
  issuingBank: string
  customerId?: number
  /** Display copy of the chosen customer, so the select can label it without a fetch. */
  customer?: { id: number; name: string; code?: string }
  giroDate: Date | null
  dueDate: Date | null
  amount: number | null
  /** Saved giros only (VIEW mode): the giro's lifecycle status and outcome. */
  status?: GiroStatus
  clearedDate?: string | null
  rejectedDate?: string | null
  rejectionNote?: string | null
}

export interface GiroRowErrors {
  giroNo?: true
  issuingBank?: true
  customer?: true
  giroDate?: true
  dueDate?: 'required' | 'beforeGiroDate'
  amount?: true
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function emptyGiroRow(): GiroRow {
  return {
    _key: crypto.randomUUID(),
    giroNo: '',
    issuingBank: '',
    giroDate: null,
    dueDate: null,
    amount: null,
  }
}

/** Every field is required, the due date can't precede the giro date, and amount > 0. */
export function giroRowErrors(row: GiroRow): GiroRowErrors {
  const errors: GiroRowErrors = {}
  if (!row.giroNo.trim()) errors.giroNo = true
  if (!row.issuingBank.trim()) errors.issuingBank = true
  if (row.customerId == null) errors.customer = true
  if (!row.giroDate) errors.giroDate = true
  if (!row.dueDate) errors.dueDate = 'required'
  else if (row.giroDate && dayjs(row.dueDate).isBefore(row.giroDate, 'day'))
    errors.dueDate = 'beforeGiroDate'
  if (row.amount == null || !(row.amount > 0)) errors.amount = true
  return errors
}

export function isGiroRowValid(row: GiroRow): boolean {
  return Object.keys(giroRowErrors(row)).length === 0
}

/**
 * The key a giro is unique on: the issuing bank case-insensitively, the giro number as typed
 * (the server compares `lower(trim(bank))` and `trim(giro_no)`). Null while either half is blank.
 */
export function giroKey(row: Pick<GiroRow, 'giroNo' | 'issuingBank'>): string | null {
  const bank = row.issuingBank.trim().toLowerCase()
  const no = row.giroNo.trim()
  return bank && no ? `${bank}|${no}` : null
}

/** Keys appearing on more than one row, so every copy can be flagged before submit. */
export function duplicateGiroKeys(rows: GiroRow[]): Set<string> {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const row of rows) {
    const key = giroKey(row)
    if (!key) continue
    if (seen.has(key)) dupes.add(key)
    else seen.add(key)
  }
  return dupes
}

/** The "declared" side of the custody check: what the lines add up to. */
export function recordedTotals(rows: GiroRow[]): { count: number; amount: number } {
  return {
    count: rows.length,
    amount: round2(rows.reduce((s, r) => s + (r.amount ?? 0), 0)),
  }
}

/**
 * Verified minus declared, per unit. A unit the admin hasn't counted yet has nothing to compare
 * against, so its variance is 0 until a value is entered.
 */
export function variances(
  recorded: { count: number; amount: number },
  actual: { count: number | null; amount: number | null },
): { count: number; amount: number } {
  return {
    count: actual.count === null ? 0 : actual.count - recorded.count,
    amount: actual.amount === null ? 0 : round2(actual.amount - recorded.amount),
  }
}

/** A giro whose due date has already passed on the day it's entered. Warned about, never blocked. */
export function isOverdueOnEntry(row: GiroRow, today: Date = new Date()): boolean {
  return !!row.dueDate && dayjs(row.dueDate).isBefore(today, 'day')
}

export function toPayload(rows: GiroRow[]): GiroLineRequest[] {
  return rows.map((r) => ({
    giroNo: r.giroNo.trim(),
    issuingBank: r.issuingBank.trim(),
    customerId: r.customerId as number,
    // dayjs, never toISOString() — UTC+7 lands a day early.
    giroDate: dayjs(r.giroDate as Date).format('YYYY-MM-DD'),
    dueDate: dayjs(r.dueDate as Date).format('YYYY-MM-DD'),
    amount: (r.amount as number).toFixed(2),
  }))
}
