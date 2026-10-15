import { describe, expect, it } from 'vitest'
import vectors from './testdata/cycle_vectors.json'
import {
  addDays,
  addMonths,
  cycleWeek,
  frequencyMatches,
  maskToggle,
  monthPreview,
  parsePatternLabel,
  weekdayBit,
  weekdayOccurrence,
} from './visitCycle'

describe('cycleWeek', () => {
  it.each(vectors.vectors)('$date is week $week ($note)', ({ date, week }) => {
    expect(cycleWeek(date, vectors.anchor)).toBe(week)
  })
})

describe('weekdayBit', () => {
  it('numbers Monday 0 through Sunday 6', () => {
    expect(weekdayBit('2026-10-12')).toBe(0)
    expect(weekdayBit('2026-10-14')).toBe(2)
    expect(weekdayBit('2026-10-18')).toBe(6)
    expect(weekdayBit('1969-12-28')).toBe(6)
  })
})

describe('frequencyMatches', () => {
  it('matches the cycle weeks of each frequency', () => {
    expect([1, 2, 3, 4].map((w) => frequencyMatches('F4', null, w))).toEqual([true, true, true, true])
    expect([1, 2, 3, 4].map((w) => frequencyMatches('F2_ODD', null, w))).toEqual([true, false, true, false])
    expect([1, 2, 3, 4].map((w) => frequencyMatches('F2_EVEN', null, w))).toEqual([false, true, false, true])
    expect([1, 2, 3, 4].map((w) => frequencyMatches('F1', 3, w))).toEqual([false, false, true, false])
  })
})

describe('date helpers', () => {
  it('adds days and months across boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })

  it('counts the nth weekday of a month', () => {
    expect(weekdayOccurrence('2026-10-01')).toBe(1)
    expect(weekdayOccurrence('2026-10-29')).toBe(5)
  })

  it('toggles a mask bit both ways', () => {
    expect(maskToggle(maskToggle(0, 2), 2)).toBe(0)
    expect(maskToggle(1, 2)).toBe(5)
  })
})

describe('parsePatternLabel', () => {
  it('reads the labels the API sends', () => {
    expect(parsePatternLabel('F1:3')).toEqual({ kind: 'F1', f1Week: 3 })
    expect(parsePatternLabel('F2_ODD')).toEqual({ kind: 'F2_ODD' })
    expect(parsePatternLabel('CUSTOM')).toEqual({ kind: 'CUSTOM' })
    expect(parsePatternLabel(null)).toBeNull()
    expect(parsePatternLabel('nonsense')).toBeNull()
  })
})

describe('monthPreview', () => {
  const base = { anchor: '2026-01-05', allowSunday: false, isHoliday: () => false }

  it('lists every Monday for a weekly Monday pattern', () => {
    const dates = monthPreview({ ...base, month: '2026-10', daysMask: 1, frequency: 'F4' })
    expect(dates).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
  })

  it('keeps the odd weeks of the running cycle', () => {
    // 2026-10-05 is W1 of the cycle anchored on 2026-01-05 (39 weeks later).
    const dates = monthPreview({ ...base, month: '2026-10', daysMask: 1, frequency: 'F2_ODD' })
    expect(dates.length).toBe(2)
    for (const d of dates) expect([1, 3]).toContain(cycleWeek(d, base.anchor))
  })

  it('skips holidays and a Sunday that is not allowed', () => {
    const month = '2026-10'
    const sundaysAndMondays = 1 | (1 << 6)
    const off = monthPreview({
      ...base,
      month,
      daysMask: sundaysAndMondays,
      frequency: 'F4',
      isHoliday: (d) => d === '2026-10-12',
    })
    expect(off).not.toContain('2026-10-12')
    expect(off.some((d) => weekdayBit(d) === 6)).toBe(false)
    const on = monthPreview({ ...base, month, daysMask: 1 << 6, frequency: 'F4', allowSunday: true })
    expect(on).toEqual(['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25'])
  })
})
