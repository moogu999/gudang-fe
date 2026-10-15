import { describe, expect, it } from 'vitest'
import { copyToNextMonth } from './customDates'

const rules = { today: '2026-10-15', allowSunday: false, isHoliday: () => false }

describe('copyToNextMonth', () => {
  it('maps the same weekday and week of the month', () => {
    // The 1st Tuesday (Oct 6) lands on Nov 3, the 3rd Thursday (Oct 15) on Nov 19.
    const result = copyToNextMonth(['2026-10-06', '2026-10-15'], rules)
    expect(result.copied).toEqual(['2026-11-03', '2026-11-19'])
    expect(result.skipped).toEqual([])
  })

  it('skips a 5th occurrence that next month does not have', () => {
    // 2026-10-29 is the 5th Thursday; November 2026 has only four.
    const result = copyToNextMonth(['2026-10-29'], rules)
    expect(result.copied).toEqual([])
    expect(result.skipped).toEqual([{ from: '2026-10-29', reason: 'no_occurrence' }])
  })

  it('skips holidays and Sundays', () => {
    const result = copyToNextMonth(['2026-10-04', '2026-10-06'], {
      ...rules,
      isHoliday: (d) => d === '2026-11-03',
    })
    expect(result.copied).toEqual([])
    expect(result.skipped.map((s) => s.reason)).toEqual(['sunday', 'holiday'])
  })

  it('does not copy into the past', () => {
    const result = copyToNextMonth(['2026-10-06'], { ...rules, today: '2026-11-30' })
    expect(result.skipped[0].reason).toBe('past')
  })
})
