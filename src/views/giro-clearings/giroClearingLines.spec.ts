import { describe, it, expect } from 'vitest'
import {
  buildResultsPayload,
  defaultDueOnOrBefore,
  isNotYetDue,
  resultRowErrors,
  resultTotals,
  selectionTotal,
  type GiroPick,
  type ResultRow,
} from './giroClearingLines'

function pick(giroId: number, amount: number): GiroPick {
  return {
    giroId,
    giroNo: `BG-${giroId}`,
    issuingBank: 'BCA',
    customerName: 'Toko',
    dueDate: '2026-09-23',
    amount,
  }
}

function resultRow(over: Partial<ResultRow> & { lineId: number }): ResultRow {
  return {
    giroNo: `BG-${over.lineId}`,
    issuingBank: 'BCA',
    customerName: 'Toko',
    amount: 1000,
    savedResult: 'pending',
    result: '',
    note: '',
    ...over,
  }
}

describe('selection', () => {
  it('totals the picked giros', () => {
    expect(selectionTotal([pick(1, 100.1), pick(2, 200.2)])).toEqual({ count: 2, amount: 300.3 })
  })

  it('defaults the picker to due on or before the day after the deposit (D8)', () => {
    expect(defaultDueOnOrBefore(new Date(2026, 8, 30))).toBe('2026-10-01')
  })

  it('warns only when a giro is due more than a day after the deposit', () => {
    const deposit = new Date(2026, 8, 23)
    expect(isNotYetDue('2026-09-24', deposit)).toBe(false)
    expect(isNotYetDue('2026-09-25', deposit)).toBe(true)
    expect(isNotYetDue('2026-09-01', deposit)).toBe(false)
    expect(isNotYetDue('2026-12-01', null)).toBe(false)
  })
})

describe('results', () => {
  const rows = [
    resultRow({ lineId: 1, result: 'cleared', amount: 1000 }),
    resultRow({ lineId: 2, result: 'rejected', note: ' Dana tidak cukup ', amount: 500 }),
    resultRow({ lineId: 3 }),
    resultRow({ lineId: 4, savedResult: 'cleared', result: 'rejected' }),
  ]

  it('sends only pending lines with a chosen result (partial results)', () => {
    expect(buildResultsPayload(rows, new Date(2026, 8, 24))).toEqual({
      resultDate: '2026-09-24',
      lines: [
        { lineId: 1, result: 'cleared', note: null },
        { lineId: 2, result: 'rejected', note: 'Dana tidak cukup' },
      ],
    })
  })

  it('totals what is about to be recorded, skipping lines already resolved', () => {
    expect(resultTotals(rows)).toEqual({
      cleared: { count: 1, amount: 1000 },
      rejected: { count: 1, amount: 500 },
    })
  })

  it('requires a note on a rejected line only', () => {
    expect(resultRowErrors(resultRow({ lineId: 1, result: 'rejected' }))).toEqual({ note: true })
    expect(resultRowErrors(resultRow({ lineId: 1, result: 'rejected', note: '  ' }))).toEqual({
      note: true,
    })
    expect(resultRowErrors(resultRow({ lineId: 1, result: 'cleared' }))).toEqual({})
  })
})
