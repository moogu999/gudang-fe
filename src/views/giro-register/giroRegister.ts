import type { GiroBucket, GiroBucketCounts, GiroRegisterRow } from '@/types/giroReceipt.type'

export type DueSeverity = 'info' | 'danger' | 'warn' | 'secondary' | 'success'

export interface DueLabel {
  /** i18n key under `giroRegister.due`. */
  key: string
  params: Record<string, number>
  severity: DueSeverity
}

/** "Due soon" is 0 to 7 days to due. */
export const DUE_SOON_DAYS = 7

/** The register's status column: lifecycle first, then — for a held giro — how close it is to due. */
export function dueLabel(daysToDue: number, status: GiroRegisterRow['status']): DueLabel {
  switch (status) {
    case 'clearing':
      return { key: 'inClearing', params: {}, severity: 'info' }
    case 'cleared':
      return { key: 'cleared', params: {}, severity: 'success' }
    case 'rejected':
      return { key: 'rejected', params: {}, severity: 'danger' }
  }
  if (daysToDue < 0) return { key: 'overdueDays', params: { n: -daysToDue }, severity: 'danger' }
  if (daysToDue === 0) return { key: 'dueToday', params: {}, severity: 'warn' }
  if (daysToDue <= DUE_SOON_DAYS)
    return { key: 'dueInDays', params: { n: daysToDue }, severity: 'warn' }
  return { key: 'held', params: {}, severity: 'secondary' }
}

/** Tab order and which `meta.counts` field badges each tab. */
export const BUCKETS: { bucket: GiroBucket; countKey: keyof GiroBucketCounts }[] = [
  { bucket: 'custody', countKey: 'custody' },
  { bucket: 'held', countKey: 'held' },
  { bucket: 'due_soon', countKey: 'dueSoon' },
  { bucket: 'overdue', countKey: 'overdue' },
  { bucket: 'clearing', countKey: 'clearing' },
  { bucket: 'history', countKey: 'history' },
]

/** Buckets whose rows are all `held`, so they can be picked for a clearing batch. */
export const SELECTABLE_BUCKETS: GiroBucket[] = ['held', 'due_soon', 'overdue']

export interface DepositSelection {
  ids: number[]
  /** The one branch every picked giro belongs to; null when none is picked or they differ. */
  branchId: number | null
  /** A clearing batch is single-branch, so a mixed pick can't be deposited. */
  mixedBranches: boolean
  amount: number
}

export function depositSelection(rows: GiroRegisterRow[]): DepositSelection {
  const branches = new Set(rows.map((r) => r.branchId))
  const cents = rows.reduce((s, r) => s + Math.round((parseFloat(r.amount) || 0) * 100), 0)
  return {
    ids: rows.map((r) => r.id),
    branchId: branches.size === 1 ? rows[0].branchId : null,
    mixedBranches: branches.size > 1,
    amount: cents / 100,
  }
}

/**
 * Query for `/giro-clearings/create` that pre-picks these giros (and their branch). Ids travel
 * in the URL rather than router state so a refresh keeps the pick.
 */
export function depositQuery(selection: DepositSelection): Record<string, string> {
  return { branchId: String(selection.branchId), giroIds: selection.ids.join(',') }
}

/** The inverse of depositQuery, tolerant of hand-edited URLs. */
export function parseDepositQuery(query: Record<string, unknown>): {
  branchId: number | null
  giroIds: number[]
} {
  const branch = Number(query.branchId)
  const raw = typeof query.giroIds === 'string' ? query.giroIds : ''
  const giroIds = [
    ...new Set(
      raw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ]
  return { branchId: Number.isInteger(branch) && branch > 0 ? branch : null, giroIds }
}
