import type { SalesCreditNoteAppliedStatus } from '@/types'

/**
 * How much of a note has been consumed through AR Clearing. Display only: a note has no
 * status of its own and is never voided.
 */
export function appliedStatus(
  appliedAmount: string | number | undefined,
  totalAmount: string | number | undefined,
): SalesCreditNoteAppliedStatus {
  const applied = Math.round((parseFloat(String(appliedAmount ?? '')) || 0) * 100)
  const total = Math.round((parseFloat(String(totalAmount ?? '')) || 0) * 100)
  if (applied <= 0) return 'none'
  return applied >= total ? 'full' : 'partial'
}

export function appliedSeverity(status: SalesCreditNoteAppliedStatus): 'warn' | 'info' | 'success' {
  if (status === 'full') return 'success'
  return status === 'partial' ? 'info' : 'warn'
}
