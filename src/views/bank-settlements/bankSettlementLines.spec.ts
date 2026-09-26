import { describe, it, expect } from 'vitest'
import type { GiroClearingCandidate } from '@/types/bankSettlement.type'
import {
  batchOverMatch,
  giroLookalike,
  isRowValid,
  isTagged,
  tagMode,
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

  it('a line tagged to a giro clearing batch counts as tagged (D13)', () => {
    expect(isTagged(row({ giroClearingId: 3 }))).toBe(true)
    expect(partition([row({ giroClearingId: 3 })]).tagged).toHaveLength(1)
  })
})

describe('tagMode', () => {
  it('reports which tag a line carries', () => {
    expect(tagMode(row({ customerId: 5 }))).toBe('customer')
    expect(tagMode(row({ giroClearingId: 3 }))).toBe('giro')
    expect(tagMode(row())).toBe('none')
  })
})

function candidate(over: Partial<GiroClearingCandidate> = {}): GiroClearingCandidate {
  return {
    id: 3,
    no: 'KG-202609-000001',
    status: 'completed',
    depositDate: '2026-09-05',
    clearedAmount: '1500.00',
    bankMatchedAmount: '0.00',
    unmatchedAmount: '1500.00',
    clearedGiros: [
      {
        giroId: 11,
        giroNo: 'BG-11',
        customerId: 5,
        customerName: 'Toko Lima',
        amount: '1000.00',
        clearedDate: '2026-09-07',
      },
      {
        giroId: 12,
        giroNo: 'BG-12',
        customerId: 6,
        customerName: 'Toko Enam',
        amount: '500.00',
        clearedDate: '2026-09-07',
      },
    ],
    ...over,
  }
}

describe('giroLookalike (D13)', () => {
  it("hits a customer's cleared giro with the same amount within ±7 days", () => {
    const hit = giroLookalike(row({ customerId: 5, amount: 1000 }), [candidate()])
    expect(hit?.giroNo).toBe('BG-11')
    expect(hit?.clearingNo).toBe('KG-202609-000001')
  })

  it('misses on another customer, another amount, or a date outside the window', () => {
    expect(giroLookalike(row({ customerId: 6, amount: 1000 }), [candidate()])).toBeUndefined()
    expect(giroLookalike(row({ customerId: 5, amount: 999 }), [candidate()])).toBeUndefined()
    expect(
      giroLookalike(row({ customerId: 5, amount: 1000, mutationDate: new Date(2026, 8, 15) }), [
        candidate(),
      ]),
    ).toBeUndefined()
    // Exactly 7 days is still inside the window.
    expect(
      giroLookalike(row({ customerId: 5, amount: 1000, mutationDate: new Date(2026, 8, 14) }), [
        candidate(),
      ]),
    ).toBeDefined()
  })

  it('never warns on a line that is not tagged to a customer', () => {
    expect(giroLookalike(row({ amount: 1000 }), [candidate()])).toBeUndefined()
    expect(giroLookalike(row({ giroClearingId: 3, amount: 1000 }), [candidate()])).toBeUndefined()
  })
})

describe('batchOverMatch (D13)', () => {
  it('flags a batch linked for more than its unmatched amount, across lines', () => {
    const rows = [row({ giroClearingId: 3, amount: 1000 }), row({ giroClearingId: 3, amount: 600 })]
    expect(batchOverMatch(rows, [candidate()])).toEqual([
      { id: 3, no: 'KG-202609-000001', linked: 1600, unmatched: 1500 },
    ])
  })

  it('accepts a link up to the unmatched amount exactly', () => {
    const rows = [row({ giroClearingId: 3, amount: 1500 }), row({ customerId: 5, amount: 9000 })]
    expect(batchOverMatch(rows, [candidate()])).toEqual([])
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
