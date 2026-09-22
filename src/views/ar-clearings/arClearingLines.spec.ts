import { describe, it, expect } from 'vitest'
import {
  autoAllocate,
  totals,
  agingSeverity,
  allocationState,
  keyOf,
  toSourceRow,
  toAllocationRow,
  type SourceRow,
  type AllocationRow,
} from './arClearingLines'

function source(over: Partial<SourceRow> & { sourceLineId: number; unappliedAmount: string }) {
  return toSourceRow({
    sourceType: 'cash_deposit',
    sourceDocumentId: 1,
    sourceDocumentNo: 'CD-1',
    customerId: 1,
    sourceDate: '2026-09-01',
    amount: over.unappliedAmount,
    appliedAmount: '0',
    sourceDetail: 'adhoc',
    description: '',
    ...over,
  })
}

function invoice(id: number, date: string, outstanding: string): AllocationRow {
  return toAllocationRow({
    documentType: 'invoice',
    documentId: id,
    documentNo: `INV-${id}`,
    customerId: 1,
    customerName: 'Toko',
    documentDate: date,
    ageDays: 10,
    totalAmount: outstanding,
    settledAmount: '0',
    outstandingAmount: outstanding,
  })
}

const alloc = (rows: AllocationRow[]) => rows.map((r) => r.allocated)

describe('keyOf', () => {
  it('keys on the type/line pair so equal line ids from two source types do not collide', () => {
    expect(keyOf('cash_deposit', 5)).not.toBe(keyOf('bank_settlement', 5))
  })
})

describe('totals', () => {
  it('derives available, allocated and unallocated', () => {
    const picked = [source({ sourceLineId: 1, unappliedAmount: '1000.50' })]
    const rows = [
      invoice(1, '2026-08-01', '600'),
      { ...invoice(2, '2026-08-02', '600'), allocated: 300.25 },
    ]
    expect(totals(picked, [{ ...rows[0], allocated: 200 }, rows[1]])).toEqual({
      available: 1000.5,
      allocated: 500.25,
      unallocated: 500.25,
    })
  })

  it('reports an exact zero when everything is allocated', () => {
    const picked = [source({ sourceLineId: 1, unappliedAmount: '0.30' })]
    const rows = [
      { ...invoice(1, '2026-08-01', '0.10'), allocated: 0.1 },
      { ...invoice(2, '2026-08-02', '0.20'), allocated: 0.2 },
    ]
    expect(totals(picked, rows).unallocated).toBe(0)
  })

  it('is all zero with nothing picked', () => {
    expect(totals([], [invoice(1, '2026-08-01', '100')])).toEqual({
      available: 0,
      allocated: 0,
      unallocated: 0,
    })
  })
})

describe('autoAllocate', () => {
  it('honours a hint when the hinted invoice is in the list', () => {
    const rows = [invoice(1, '2026-07-01', '500'), invoice(2, '2026-08-01', '500')]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '300', hintInvoiceId: 2 })]
    expect(alloc(autoAllocate(picked, rows))).toEqual([0, 300])
  })

  it('ignores a hint whose invoice is not in the list and falls back to FIFO', () => {
    const rows = [invoice(1, '2026-07-01', '500'), invoice(2, '2026-08-01', '500')]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '300', hintInvoiceId: 99 })]
    expect(alloc(autoAllocate(picked, rows))).toEqual([300, 0])
  })

  it('never lets a hint pay more than its source remainder', () => {
    const rows = [invoice(1, '2026-07-01', '1000')]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '400', hintInvoiceId: 1 })]
    expect(alloc(autoAllocate(picked, rows))).toEqual([400])
  })

  it('spreads the remainder oldest-first and leaves the last touched invoice partial', () => {
    const rows = [
      invoice(3, '2026-09-01', '500'),
      invoice(1, '2026-07-01', '500'),
      invoice(2, '2026-08-01', '500'),
    ]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '1200' })]
    const result = autoAllocate(picked, rows)
    // Input order is preserved; allocation follows date order (1, 2, then 3).
    expect(result.map((r) => r.documentId)).toEqual([3, 1, 2])
    expect(alloc(result)).toEqual([200, 500, 500])
    expect(allocationState(result[0])).toBe('partial')
  })

  it('tiebreaks equal dates on documentId', () => {
    const rows = [invoice(2, '2026-07-01', '100'), invoice(1, '2026-07-01', '100')]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '100' })]
    expect(alloc(autoAllocate(picked, rows))).toEqual([0, 100])
  })

  it('leaves a remainder and over-allocates nothing when the pool exceeds the outstanding total', () => {
    const rows = [invoice(1, '2026-07-01', '100'), invoice(2, '2026-08-01', '50')]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '1000' })]
    const result = autoAllocate(picked, rows)
    expect(alloc(result)).toEqual([100, 50])
    expect(totals(picked, result).unallocated).toBe(850)
  })

  it('allocates nothing for a pool of zero', () => {
    const rows = [invoice(1, '2026-07-01', '100')]
    expect(alloc(autoAllocate([], rows))).toEqual([0])
  })

  it('does not double-spend a hinted source in the FIFO pass', () => {
    const rows = [invoice(1, '2026-07-01', '500'), invoice(2, '2026-08-01', '500')]
    const picked = [
      source({ sourceLineId: 1, unappliedAmount: '300', hintInvoiceId: 2 }),
      source({ sourceLineId: 2, unappliedAmount: '100' }),
    ]
    expect(alloc(autoAllocate(picked, rows))).toEqual([100, 300])
  })

  it('keeps cents exact', () => {
    const rows = [invoice(1, '2026-07-01', '0.10'), invoice(2, '2026-08-01', '0.20')]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '0.30' })]
    expect(alloc(autoAllocate(picked, rows))).toEqual([0.1, 0.2])
  })

  it('does not mutate its inputs', () => {
    const rows = [invoice(1, '2026-07-01', '100')]
    const picked = [source({ sourceLineId: 1, unappliedAmount: '50', hintInvoiceId: 1 })]
    const rowsSnapshot = JSON.stringify(rows)
    const pickedSnapshot = JSON.stringify(picked)
    const result = autoAllocate(picked, rows)
    expect(JSON.stringify(rows)).toBe(rowsSnapshot)
    expect(JSON.stringify(picked)).toBe(pickedSnapshot)
    expect(result).not.toBe(rows)
    expect(result[0]).not.toBe(rows[0])
  })
})

describe('agingSeverity', () => {
  it.each([
    [0, 'ok'],
    [14, 'ok'],
    [15, 'warn'],
    [59, 'warn'],
    [60, 'danger'],
    [400, 'danger'],
  ] as const)('%i days is %s', (days, expected) => {
    expect(agingSeverity(days)).toBe(expected)
  })
})

describe('allocationState', () => {
  it('is none, partial and full', () => {
    const row = invoice(1, '2026-07-01', '100')
    expect(allocationState({ ...row, allocated: 0 })).toBe('none')
    expect(allocationState({ ...row, allocated: 40 })).toBe('partial')
    expect(allocationState({ ...row, allocated: 100 })).toBe('full')
  })
})
