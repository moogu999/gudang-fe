import { describe, it, expect } from 'vitest'
import {
  duplicateGiroKeys,
  emptyGiroRow,
  giroRowErrors,
  isOverdueOnEntry,
  recordedTotals,
  toPayload,
  variances,
  type GiroRow,
} from './giroReceiptLines'

function row(over: Partial<GiroRow> = {}): GiroRow {
  return {
    ...emptyGiroRow(),
    giroNo: 'BG-001',
    issuingBank: 'BCA Cab. Melawai',
    customerId: 7,
    giroDate: new Date(2026, 8, 1),
    dueDate: new Date(2026, 8, 30),
    amount: 1500000,
    ...over,
  }
}

describe('giroRowErrors', () => {
  it('accepts a fully-formed row', () => {
    expect(giroRowErrors(row())).toEqual({})
  })

  it('flags every blank required field', () => {
    expect(giroRowErrors(emptyGiroRow())).toEqual({
      giroNo: true,
      issuingBank: true,
      customer: true,
      giroDate: true,
      dueDate: 'required',
      amount: true,
    })
  })

  it('treats whitespace-only text as blank', () => {
    const errors = giroRowErrors(row({ giroNo: '  ', issuingBank: ' ' }))
    expect(errors.giroNo).toBe(true)
    expect(errors.issuingBank).toBe(true)
  })

  it('rejects a due date before the giro date, but allows the same day', () => {
    expect(giroRowErrors(row({ dueDate: new Date(2026, 7, 31) })).dueDate).toBe('beforeGiroDate')
    expect(giroRowErrors(row({ dueDate: new Date(2026, 8, 1) })).dueDate).toBeUndefined()
  })

  it('requires a positive amount', () => {
    expect(giroRowErrors(row({ amount: 0 })).amount).toBe(true)
    expect(giroRowErrors(row({ amount: null })).amount).toBe(true)
  })
})

describe('duplicateGiroKeys', () => {
  it('matches the bank case-insensitively and trims both halves', () => {
    const dupes = duplicateGiroKeys([
      row({ issuingBank: 'BCA', giroNo: 'BG-1' }),
      row({ issuingBank: ' bca ', giroNo: 'BG-1 ' }),
    ])
    expect([...dupes]).toEqual(['bca|BG-1'])
  })

  it('treats the giro number as case-sensitive, like the server', () => {
    expect(
      duplicateGiroKeys([
        row({ issuingBank: 'BCA', giroNo: 'bg-1' }),
        row({ issuingBank: 'BCA', giroNo: 'BG-1' }),
      ]).size,
    ).toBe(0)
  })

  it('ignores rows with a blank half', () => {
    expect(duplicateGiroKeys([row({ giroNo: '' }), row({ giroNo: '' })]).size).toBe(0)
  })
})

describe('recordedTotals / variances', () => {
  it('counts rows and sums amounts, blanks as zero', () => {
    expect(
      recordedTotals([row({ amount: 100.1 }), row({ amount: 200.2 }), row({ amount: null })]),
    ).toEqual({
      count: 3,
      amount: 300.3,
    })
  })

  it('keeps each unit at zero until it is counted', () => {
    const recorded = { count: 2, amount: 3000 }
    expect(variances(recorded, { count: null, amount: null })).toEqual({ count: 0, amount: 0 })
    expect(variances(recorded, { count: 1, amount: null })).toEqual({ count: -1, amount: 0 })
    expect(variances(recorded, { count: 2, amount: 2500 })).toEqual({ count: 0, amount: -500 })
  })
})

describe('isOverdueOnEntry', () => {
  it('is true only once the due date has passed', () => {
    const today = new Date(2026, 8, 23)
    expect(isOverdueOnEntry(row({ dueDate: new Date(2026, 8, 22) }), today)).toBe(true)
    expect(isOverdueOnEntry(row({ dueDate: new Date(2026, 8, 23) }), today)).toBe(false)
    expect(isOverdueOnEntry(row({ dueDate: null }), today)).toBe(false)
  })
})

describe('toPayload', () => {
  it('sends trimmed text, local YYYY-MM-DD dates and string amounts', () => {
    expect(
      toPayload([
        row({
          giroNo: ' BG-9 ',
          issuingBank: ' Mandiri ',
          dueDate: new Date(2026, 9, 1, 0, 30),
          amount: 1250.5,
        }),
      ]),
    ).toEqual([
      {
        giroNo: 'BG-9',
        issuingBank: 'Mandiri',
        customerId: 7,
        giroDate: '2026-09-01',
        dueDate: '2026-10-01',
        amount: '1250.50',
      },
    ])
  })
})
