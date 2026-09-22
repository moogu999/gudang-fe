import dayjs from 'dayjs'

export interface MutationRow {
  _key: string
  mutationDate: Date | null
  description: string
  amount: number | null
  customerId?: number
  /** Display copy of the chosen customer, so the select can label it without a fetch. */
  customer?: { id: number; name: string; code?: string }
  note: string | null
}

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

/** D3: credit lines only, so amount > 0. D9: the date must sit inside the header period (inclusive). */
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

/** "Untagged" is the absence of a customer (master §4 assumption 6). */
export function isTagged(row: MutationRow): boolean {
  return row.customerId != null
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
