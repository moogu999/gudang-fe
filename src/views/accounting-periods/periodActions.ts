import type { AccountingPeriod } from '@/types/accountingPeriod.type'

export type PeriodAction =
  | 'open'
  | 'close'
  | 'request-reopen'
  | 'permanent-close'
  | 'revert-permanent-close'

function openIndex(timeline: AccountingPeriod[]): number {
  return timeline.findIndex((p) => p.status === 'OPEN')
}

function indexOf(timeline: AccountingPeriod[], id: number): number {
  return timeline.findIndex((p) => p.id === id)
}

/** The single period CanReopen would currently accept — the immediate
 *  predecessor of the OPEN period, or (when nothing is open) the last
 *  CLOSED period — or -1 when none exists. Mirrors Timeline.ReopenableIndex
 *  in gudang-be usecase/transitions.go. */
function reopenableIndex(timeline: AccountingPeriod[]): number {
  const openIdx = openIndex(timeline)

  if (openIdx !== -1) {
    if (openIdx === 0) {
      return -1
    }
    return timeline[openIdx - 1]!.status === 'CLOSED' ? openIdx - 1 : -1
  }

  let lastClosedIdx = -1
  timeline.forEach((p, i) => {
    if (p.status === 'CLOSED') {
      lastClosedIdx = i
    }
  })
  return lastClosedIdx
}

/** The actions this row offers, given the whole timeline. Mirrors
 *  Timeline.CanX in gudang-be usecase/transitions.go:
 *   - open:                   nothing is open, and this row is UPCOMING
 *   - close:                  this row is OPEN
 *   - request-reopen:         this row is CLOSED and is the immediate
 *                             predecessor of the OPEN row
 *   - permanent-close:        this row is CLOSED and its predecessor is
 *                             PERMANENTLY_CLOSED or does not exist
 *   - revert-permanent-close: this row is the newest PERMANENTLY_CLOSED */
export function actionsFor(period: AccountingPeriod, timeline: AccountingPeriod[]): PeriodAction[] {
  const idx = indexOf(timeline, period.id)
  if (idx === -1) {
    return []
  }

  const actions: PeriodAction[] = []

  if (period.status === 'UPCOMING' && openIndex(timeline) === -1) {
    actions.push('open')
  }

  if (period.status === 'OPEN') {
    actions.push('close')
  }

  if (period.status === 'CLOSED' && idx === reopenableIndex(timeline)) {
    actions.push('request-reopen')
  }

  if (
    period.status === 'CLOSED' &&
    (idx === 0 || timeline[idx - 1]!.status === 'PERMANENTLY_CLOSED')
  ) {
    actions.push('permanent-close')
  }

  if (
    period.status === 'PERMANENTLY_CLOSED' &&
    timeline.slice(idx + 1).every((p) => p.status !== 'PERMANENTLY_CLOSED')
  ) {
    actions.push('revert-permanent-close')
  }

  return actions
}

/** The row that would become OPEN if `period` were closed — for the
 *  confirmation copy. Null when `period` is the last one defined. */
export function successorOf(
  period: AccountingPeriod,
  timeline: AccountingPeriod[],
): AccountingPeriod | null {
  const idx = indexOf(timeline, period.id)
  if (idx === -1 || idx === timeline.length - 1) {
    return null
  }
  return timeline[idx + 1]!
}

/** The rows that would be auto-closed by opening `period` — for the
 *  confirmation copy on the initial back-dated open. Only UPCOMING rows
 *  change; anything already CLOSED or PERMANENTLY_CLOSED is untouched. */
export function periodsClosedByOpening(
  period: AccountingPeriod,
  timeline: AccountingPeriod[],
): AccountingPeriod[] {
  const idx = indexOf(timeline, period.id)
  if (idx === -1) {
    return []
  }
  return timeline.slice(0, idx).filter((p) => p.status === 'UPCOMING')
}
