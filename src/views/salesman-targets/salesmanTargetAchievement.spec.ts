import { describe, it, expect } from 'vitest'
import { band, idealPct, mergeAchievement, pct, runRate } from './salesmanTargetAchievement'
import type { SalesmanTarget, SalesmanTargetAchievement } from '@/types/salesmanTarget.type'

describe('pct', () => {
  it('is null without a target or with a target of 0', () => {
    expect(pct(5, null)).toBeNull()
    expect(pct(5, 0)).toBeNull()
  })
  it('divides achieved by target', () => {
    expect(pct(25, 100)).toBe(25)
  })
})

describe('runRate', () => {
  it('is null before any working day has passed', () => {
    expect(runRate(10, 100, { total: 26, elapsed: 0 })).toBeNull()
  })
  it('equals the achieved % once the period is over', () => {
    expect(runRate(40, 100, { total: 26, elapsed: 26 })).toBeCloseTo(40)
  })
  it('projects the month from the days so far', () => {
    expect(runRate(119.6, 520, { total: 26, elapsed: 6 })).toBeCloseTo(99.67, 1)
  })
})

describe('a net-negative achievement (returns exceed sales)', () => {
  it('gives a negative % rather than clamping to 0', () => {
    expect(pct(-20, 100)).toBe(-20)
  })
  it('falls in the bad band', () => {
    expect(band(-20, 20)).toBe('bad')
  })
})

describe('idealPct', () => {
  it('is elapsed over total', () => {
    expect(idealPct({ total: 26, elapsed: 6 })).toBeCloseTo(23.08, 1)
    expect(idealPct({ total: 0, elapsed: 0 })).toBeNull()
  })
})

describe('band', () => {
  it('is good at exactly the ideal', () => expect(band(20, 20)).toBe('good'))
  it('is warn at exactly 70 % of the ideal', () => expect(band(14, 20)).toBe('warn'))
  it('is bad just below 70 % of the ideal', () => expect(band(13.99, 20)).toBe('bad'))
  it('is null when either side is missing', () => {
    expect(band(null, 20)).toBeNull()
    expect(band(10, null)).toBeNull()
  })
})

describe('mergeAchievement', () => {
  const target = {
    lines: [
      {
        employeeId: 2,
        employeeName: 'B',
        employeeActive: true,
        targetValue: '100',
        cells: { '9': '40' },
      },
      { employeeId: 1, employeeName: 'A', employeeActive: false, cells: {} },
    ],
  } as unknown as SalesmanTarget
  const achievement = {
    lines: [{ employeeId: 2, achievedValue: '12.5', cells: { '9': '8' } }],
  } as unknown as SalesmanTargetAchievement

  it('keeps the document order and parses decimals', () => {
    const rows = mergeAchievement(target, achievement)
    expect(rows.map((r) => r.employeeId)).toEqual([2, 1])
    expect(rows[0].achievedValue).toBe(12.5)
    expect(rows[0].targetValue).toBe(100)
    expect(rows[0].achievedCells['9']).toBe(8)
  })
  it('gives a salesman missing from the response 0 and no target', () => {
    const row = mergeAchievement(target, achievement)[1]
    expect(row.achievedValue).toBe(0)
    expect(row.targetValue).toBeNull()
    expect(row.achievedCells).toEqual({})
  })
})
