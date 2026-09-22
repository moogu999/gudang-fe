import { describe, it, expect } from 'vitest'
import {
  isRowValid,
  isTagged,
  newMutationRow,
  partition,
  rowErrors,
  round2,
  totals,
  type MutationRow,
  type Period,
} from './bankSettlementLines'

const period: Period = [new Date(2026, 8, 1), new Date(2026, 8, 15)]

function row(changes: Partial<MutationRow> = {}): MutationRow {
  return {
    ...newMutationRow(),
    mutationDate: new Date(2026, 8, 10),
    description: 'TRSF E-BANKING CR',
    amount: 1000,
    ...changes,
  }
}

describe('totals', () => {
  it('splits tagged from untagged and keeps total = tagged + untagged', () => {
    const rows = [
      row({ amount: 1150000, customerId: 1 }),
      row({ amount: 320000.5 }),
      row({ amount: 89999.5, customerId: 2 }),
      row({ amount: 10 }),
    ]
    expect(totals(rows)).toEqual({ total: 1560010, tagged: 1239999.5, untagged: 320010.5 })
  })

  it('treats a blank amount as zero', () => {
    expect(totals([row({ amount: null })])).toEqual({ total: 0, tagged: 0, untagged: 0 })
  })
})

describe('partition', () => {
  it('preserves the original order within each side', () => {
    const rows = [
      row({ description: 'a', customerId: 1 }),
      row({ description: 'b' }),
      row({ description: 'c', customerId: 2 }),
      row({ description: 'd' }),
    ]
    const { tagged, untagged } = partition(rows)
    expect(tagged.map((r) => r.description)).toEqual(['a', 'c'])
    expect(untagged.map((r) => r.description)).toEqual(['b', 'd'])
  })

  it('isTagged is the presence of a customer', () => {
    expect(isTagged(row({ customerId: 5 }))).toBe(true)
    expect(isTagged(row())).toBe(false)
  })
})

describe('rowErrors', () => {
  it('accepts a fully-formed row', () => {
    expect(rowErrors(row(), period)).toEqual({})
    expect(isRowValid(row(), period)).toBe(true)
  })

  it('flags a date outside the period (D9)', () => {
    expect(rowErrors(row({ mutationDate: new Date(2026, 8, 16) }), period).date).toBe('outOfPeriod')
    expect(rowErrors(row({ mutationDate: new Date(2026, 7, 31) }), period).date).toBe('outOfPeriod')
  })

  it('accepts the boundary dates', () => {
    expect(rowErrors(row({ mutationDate: new Date(2026, 8, 1) }), period).date).toBeUndefined()
    expect(
      rowErrors(row({ mutationDate: new Date(2026, 8, 15, 23, 59) }), period).date,
    ).toBeUndefined()
  })

  it('flags a missing date, and skips the period check without a period', () => {
    expect(rowErrors(row({ mutationDate: null }), period).date).toBe('required')
    expect(rowErrors(row({ mutationDate: new Date(2030, 0, 1) }), null).date).toBeUndefined()
  })

  it('flags a zero, negative or blank amount (D3)', () => {
    expect(rowErrors(row({ amount: 0 }), period).amount).toBe(true)
    expect(rowErrors(row({ amount: -5 }), period).amount).toBe(true)
    expect(rowErrors(row({ amount: null }), period).amount).toBe(true)
  })

  it('flags a blank description', () => {
    expect(rowErrors(row({ description: '   ' }), period).description).toBe(true)
  })
})

describe('round2', () => {
  it('absorbs float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(1.005 * 100)).toBe(100.5)
  })
})
