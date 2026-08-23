import type { CreditDebitNoteType } from '@/types/creditDebitNote.type'

/**
 * Stored amounts are always positive magnitudes (master decision 2) — the sign is
 * presentation only, applied here for rendering and nowhere else. Never send the
 * result of this function back to the server as `taxBaseAmount`/`taxAmount`.
 */
export function signedAmount(value: number, noteType: CreditDebitNoteType): number {
  return noteType === 'credit' ? -value : value
}
