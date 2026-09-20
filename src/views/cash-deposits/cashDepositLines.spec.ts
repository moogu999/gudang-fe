import { describe, it, expect } from 'vitest'
import { clamp, isAdhocRowValid, lineStatus, type AdhocRow } from './cashDepositLines'

function row(overrides: Partial<AdhocRow> = {}): AdhocRow {
  return { _key: 'k', note: '', amount: 100, categoryId: 1, ...overrides }
}

describe('isAdhocRowValid', () => {
  it('fails without a customer', () => {
    expect(isAdhocRowValid(row())).toBe(false)
  })

  it('passes with a customer', () => {
    expect(isAdhocRowValid(row({ customerId: 5 }))).toBe(true)
  })

  it('fails without a category or with a non-positive amount', () => {
    expect(isAdhocRowValid(row({ customerId: 5, categoryId: undefined }))).toBe(false)
    expect(isAdhocRowValid(row({ customerId: 5, amount: 0 }))).toBe(false)
  })
})

describe('clamp', () => {
  it('bounds the amount to [0, max]', () => {
    expect(clamp(-5, 100)).toBe(0)
    expect(clamp(150, 100)).toBe(100)
    expect(clamp(40, 100)).toBe(40)
    expect(clamp(null, 100)).toBe(0)
  })
})

describe('lineStatus', () => {
  it('flips from partial to paid at the remaining amount', () => {
    expect(lineStatus(0, 100)).toBeNull()
    expect(lineStatus(99.99, 100)).toBe('partial')
    expect(lineStatus(100, 100)).toBe('paid')
  })
})
