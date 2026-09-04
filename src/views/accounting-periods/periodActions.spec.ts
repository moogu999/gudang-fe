import { describe, it, expect } from 'vitest'
import { actionsFor, successorOf, periodsClosedByOpening } from './periodActions'
import type { AccountingPeriod, PeriodStatus } from '@/types/accountingPeriod.type'

function period(id: number, status: PeriodStatus): AccountingPeriod {
  return {
    id,
    companyId: 1,
    fiscalYearId: 1,
    name: `Period ${id}`,
    sequence: id,
    startDate: `2026-0${id}-01`,
    endDate: `2026-0${id}-28`,
    status,
    openedAt: null,
    openedBy: null,
    closedAt: null,
    closedBy: null,
    permanentlyClosedAt: null,
    permanentlyClosedBy: null,
    revertedAt: null,
    revertedBy: null,
    revertReason: null,
    reopenRequestStatus: null,
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 1,
    updatedAt: null,
    updatedBy: null,
  }
}

// [PERM, PERM, CLOSED, CLOSED, OPEN, UPCOMING, UPCOMING]
function fixtureTimeline(): AccountingPeriod[] {
  return [
    period(1, 'PERMANENTLY_CLOSED'),
    period(2, 'PERMANENTLY_CLOSED'),
    period(3, 'CLOSED'),
    period(4, 'CLOSED'),
    period(5, 'OPEN'),
    period(6, 'UPCOMING'),
    period(7, 'UPCOMING'),
  ]
}

describe('actionsFor', () => {
  it('offers request-reopen only on the immediate predecessor of the open period (index 3, not index 2)', () => {
    const timeline = fixtureTimeline()
    const withAction = timeline.filter((p) => actionsFor(p, timeline).includes('request-reopen'))
    expect(withAction.map((p) => p.id)).toEqual([4])
  })

  it('offers permanent-close only where the predecessor is permanently closed (index 2, not index 3)', () => {
    const timeline = fixtureTimeline()
    const withAction = timeline.filter((p) => actionsFor(p, timeline).includes('permanent-close'))
    expect(withAction.map((p) => p.id)).toEqual([3])
  })

  it('offers revert-permanent-close only on the newest permanently closed row (index 1, not index 0)', () => {
    const timeline = fixtureTimeline()
    const withAction = timeline.filter((p) =>
      actionsFor(p, timeline).includes('revert-permanent-close'),
    )
    expect(withAction.map((p) => p.id)).toEqual([2])
  })

  it('offers open on no row while a row is already open', () => {
    const timeline = fixtureTimeline()
    const withAction = timeline.filter((p) => actionsFor(p, timeline).includes('open'))
    expect(withAction).toEqual([])
  })

  it('offers open on every row and nothing else when the whole timeline is upcoming', () => {
    const timeline = [period(1, 'UPCOMING'), period(2, 'UPCOMING'), period(3, 'UPCOMING')]
    timeline.forEach((p) => {
      expect(actionsFor(p, timeline)).toEqual(['open'])
    })
  })

  it('offers close only on the open row', () => {
    const timeline = fixtureTimeline()
    const withAction = timeline.filter((p) => actionsFor(p, timeline).includes('close'))
    expect(withAction.map((p) => p.id)).toEqual([5])
  })

  it('offers request-reopen on the last closed period when nothing is currently open', () => {
    const timeline = [period(1, 'PERMANENTLY_CLOSED'), period(2, 'CLOSED'), period(3, 'CLOSED')]
    const withAction = timeline.filter((p) => actionsFor(p, timeline).includes('request-reopen'))
    expect(withAction.map((p) => p.id)).toEqual([3])
  })
})

describe('successorOf', () => {
  it('returns the next period by date', () => {
    const timeline = fixtureTimeline()
    expect(successorOf(timeline[4]!, timeline)?.id).toBe(6)
  })

  it('returns null for the last period defined', () => {
    const timeline = fixtureTimeline()
    expect(successorOf(timeline[timeline.length - 1]!, timeline)).toBeNull()
  })
})

describe('periodsClosedByOpening', () => {
  it('lists only the earlier upcoming periods, not already-closed ones', () => {
    const timeline = [
      period(1, 'PERMANENTLY_CLOSED'),
      period(2, 'CLOSED'),
      period(3, 'UPCOMING'),
      period(4, 'UPCOMING'),
      period(5, 'UPCOMING'),
    ]
    const closed = periodsClosedByOpening(timeline[4]!, timeline)
    expect(closed.map((p) => p.id)).toEqual([3, 4])
  })

  it('returns an empty list for the first period defined', () => {
    const timeline = [period(1, 'UPCOMING'), period(2, 'UPCOMING')]
    expect(periodsClosedByOpening(timeline[0]!, timeline)).toEqual([])
  })
})
