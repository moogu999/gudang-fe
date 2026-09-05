import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { generateMonthlyDrafts, validateDrafts } from './periodSchedule'
import type { PeriodDraft } from '@/types/accountingPeriod.type'

function draft(overrides: Partial<PeriodDraft> = {}): PeriodDraft {
  return {
    name: 'January 2026',
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 0, 31),
    ...overrides,
  }
}

function d(dateStr: string): Date {
  return dayjs(dateStr, 'YYYY-MM-DD').toDate()
}

describe('generateMonthlyDrafts', () => {
  it('tiles a calendar year into 12 rows', () => {
    const drafts = generateMonthlyDrafts(d('2026-01-01'), d('2026-12-31'))
    expect(drafts).toHaveLength(12)
    expect(drafts[0]!.name).toBe('January 2026')
    expect(dayjs(drafts[0]!.startDate).format('YYYY-MM-DD')).toBe('2026-01-01')
    expect(dayjs(drafts[0]!.endDate).format('YYYY-MM-DD')).toBe('2026-01-31')
    expect(drafts[11]!.name).toBe('December 2026')
    expect(dayjs(drafts[11]!.endDate).format('YYYY-MM-DD')).toBe('2026-12-31')
  })

  it('tiles an Apr–Mar fiscal year into 12 rows crossing the calendar year', () => {
    const drafts = generateMonthlyDrafts(d('2026-04-01'), d('2027-03-31'))
    expect(drafts).toHaveLength(12)
    expect(drafts[0]!.name).toBe('April 2026')
    expect(drafts[11]!.name).toBe('March 2027')
    expect(dayjs(drafts[11]!.endDate).format('YYYY-MM-DD')).toBe('2027-03-31')
  })

  it('produces a 29-day February in a leap year', () => {
    const drafts = generateMonthlyDrafts(d('2028-01-01'), d('2028-12-31'))
    const feb = drafts[1]!
    expect(dayjs(feb.startDate).format('YYYY-MM-DD')).toBe('2028-02-01')
    expect(dayjs(feb.endDate).format('YYYY-MM-DD')).toBe('2028-02-29')
  })

  it('produces a short first row for a mid-month start', () => {
    const drafts = generateMonthlyDrafts(d('2026-01-15'), d('2026-03-31'))
    expect(drafts).toHaveLength(3)
    expect(dayjs(drafts[0]!.startDate).format('YYYY-MM-DD')).toBe('2026-01-15')
    expect(dayjs(drafts[0]!.endDate).format('YYYY-MM-DD')).toBe('2026-01-31')
  })
})

describe('validateDrafts', () => {
  const start = d('2026-01-01')
  const end = d('2026-12-31')

  function exactTiling(): PeriodDraft[] {
    return generateMonthlyDrafts(start, end)
  }

  it('returns no issues for an exact tiling', () => {
    expect(validateDrafts(exactTiling(), start, end)).toEqual([])
  })

  it('reports a gap for a deleted middle row', () => {
    const drafts = exactTiling()
    drafts.splice(5, 1) // remove June
    const issues = validateDrafts(drafts, start, end)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ kind: 'gap', index: 5 })
  })

  it('reports an overlap for an extended row', () => {
    const drafts = exactTiling()
    drafts[4]!.endDate = d('2026-06-15') // May extended into June
    const issues = validateDrafts(drafts, start, end)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ kind: 'overlap', index: 5 })
  })

  it('reports uncovered-start for a late first row', () => {
    const drafts = exactTiling()
    drafts[0]!.startDate = d('2026-01-05')
    const issues = validateDrafts(drafts, start, end)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ kind: 'uncovered-start', index: 0 })
  })

  it('reports uncovered-end for an early last row', () => {
    const drafts = exactTiling()
    drafts[11]!.endDate = d('2026-12-20')
    const issues = validateDrafts(drafts, start, end)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ kind: 'uncovered-end', index: 11 })
  })

  it('reports invalid-range for an inverted row', () => {
    const drafts = exactTiling()
    drafts[3]!.startDate = d('2026-04-30')
    drafts[3]!.endDate = d('2026-04-01')
    const issues = validateDrafts(drafts, start, end)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ kind: 'invalid-range', index: 3 })
  })

  it('returns two whole-schedule issues for an empty draft list', () => {
    const issues = validateDrafts([], start, end)
    expect(issues.map((i) => i.kind).sort()).toEqual(['uncovered-end', 'uncovered-start'])
  })

  it('uses the base draft() factory as a sanity check', () => {
    const single = draft()
    expect(single.name).toBe('January 2026')
  })
})
