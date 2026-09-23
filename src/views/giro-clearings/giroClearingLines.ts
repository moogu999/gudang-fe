import dayjs from 'dayjs'
import type { GiroRegisterRow } from '@/types/giroReceipt.type'
import type {
  GiroClearingLineResponse,
  GiroClearingResult,
  GiroClearingResultsRequest,
} from '@/types/giroClearing.type'

/** A held giro as the batch picker shows and selects it, keyed by `giroId`. */
export interface GiroPick {
  giroId: number
  giroNo: string
  issuingBank: string
  customerName: string
  receiptNo?: string | null
  dueDate: string
  amount: number
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function fromRegisterRow(row: GiroRegisterRow): GiroPick {
  return {
    giroId: row.id,
    giroNo: row.giroNo,
    issuingBank: row.issuingBank,
    customerName: row.customerName,
    receiptNo: row.receiptNo,
    dueDate: row.dueDate,
    amount: parseFloat(row.amount) || 0,
  }
}

export function fromClearingLine(line: GiroClearingLineResponse): GiroPick {
  return {
    giroId: line.giroId,
    giroNo: line.giroNo,
    issuingBank: line.issuingBank,
    customerName: line.customerName ?? '',
    receiptNo: line.receiptNo,
    dueDate: line.dueDate,
    amount: parseFloat(line.amount) || 0,
  }
}

export function selectionTotal(picks: GiroPick[]): { count: number; amount: number } {
  return { count: picks.length, amount: round2(picks.reduce((s, p) => s + p.amount, 0)) }
}

/**
 * D8: the picker's default window — giros due on or before the day after the deposit date
 * ("usually H-1 up to the due date").
 */
export function defaultDueOnOrBefore(depositDate: Date): string {
  return dayjs(depositDate).add(1, 'day').format('YYYY-MM-DD')
}

/** D8: depositing a giro more than a day before it's due is warned about, never blocked. */
export function isNotYetDue(dueDate: string, depositDate: Date | null): boolean {
  if (!depositDate) return false
  return dayjs(dueDate.slice(0, 10)).isAfter(dayjs(depositDate).add(1, 'day'), 'day')
}

// ---------------------------------------------------------------------------
// Clearing results (D9)
// ---------------------------------------------------------------------------

/** One batch line in the results table. `result` is what the user picked this session. */
export interface ResultRow {
  lineId: number
  giroNo: string
  issuingBank: string
  customerName: string
  amount: number
  /** What the server has on record. Anything but `pending` is final and read-only. */
  savedResult: GiroClearingResult
  savedResultDate?: string | null
  savedNote?: string | null
  /** '' = leave pending. */
  result: '' | 'cleared' | 'rejected'
  note: string
}

export function toResultRow(line: GiroClearingLineResponse): ResultRow {
  return {
    lineId: line.id,
    giroNo: line.giroNo,
    issuingBank: line.issuingBank,
    customerName: line.customerName ?? '',
    amount: parseFloat(line.amount) || 0,
    savedResult: line.result,
    savedResultDate: line.resultDate,
    savedNote: line.note,
    result: '',
    note: '',
  }
}

export function isResolved(row: ResultRow): boolean {
  return row.savedResult !== 'pending'
}

/** A rejected giro needs the bank's reason. */
export function resultRowErrors(row: ResultRow): { note?: true } {
  if (!isResolved(row) && row.result === 'rejected' && !row.note.trim()) return { note: true }
  return {}
}

/** Totals of what this session is about to record (resolved lines are already counted). */
export function resultTotals(rows: ResultRow[]): {
  cleared: { count: number; amount: number }
  rejected: { count: number; amount: number }
} {
  const cleared = { count: 0, amount: 0 }
  const rejected = { count: 0, amount: 0 }
  for (const row of rows) {
    if (isResolved(row)) continue
    if (row.result === 'cleared') {
      cleared.count++
      cleared.amount += row.amount
    } else if (row.result === 'rejected') {
      rejected.count++
      rejected.amount += row.amount
    }
  }
  cleared.amount = round2(cleared.amount)
  rejected.amount = round2(rejected.amount)
  return { cleared, rejected }
}

/** Only pending lines with a chosen result are sent; the rest stay pending (partial results). */
export function buildResultsPayload(
  rows: ResultRow[],
  resultDate: Date,
): GiroClearingResultsRequest {
  return {
    resultDate: dayjs(resultDate).format('YYYY-MM-DD'),
    lines: rows
      .filter((r) => !isResolved(r) && r.result !== '')
      .map((r) => ({
        lineId: r.lineId,
        result: r.result as 'cleared' | 'rejected',
        note: r.note.trim() || null,
      })),
  }
}
