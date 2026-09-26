import { describe, it, expect } from 'vitest'
import type { GiroRegisterRow } from '@/types/giroReceipt.type'
import { depositQuery, depositSelection, dueLabel, parseDepositQuery } from './giroRegister'

describe('dueLabel', () => {
  it.each([
    [-6, 'overdueDays', { n: 6 }, 'danger'],
    [-1, 'overdueDays', { n: 1 }, 'danger'],
    [0, 'dueToday', {}, 'warn'],
    [3, 'dueInDays', { n: 3 }, 'warn'],
    [7, 'dueInDays', { n: 7 }, 'warn'],
    [8, 'held', {}, 'secondary'],
  ])('a held giro %i days to due reads %s', (days, key, params, severity) => {
    expect(dueLabel(days, 'held')).toEqual({ key, params, severity })
  })

  it('shows lifecycle, not due date, once the giro has left custody', () => {
    expect(dueLabel(-10, 'clearing')).toEqual({ key: 'inClearing', params: {}, severity: 'info' })
    expect(dueLabel(-10, 'cleared')).toEqual({ key: 'cleared', params: {}, severity: 'success' })
    expect(dueLabel(5, 'rejected')).toEqual({ key: 'rejected', params: {}, severity: 'danger' })
  })
})

function row(id: number, branchId: number, amount: string): GiroRegisterRow {
  return {
    id,
    giroNo: `BG-${id}`,
    issuingBank: 'BCA',
    customerId: 1,
    customerName: 'Toko',
    receiptId: 1,
    receiptNo: 'PG-1',
    receiptDate: '2026-09-01',
    branchId,
    giroDate: '2026-09-01',
    dueDate: '2026-09-20',
    daysToDue: -3,
    amount,
    appliedAmount: '0',
    status: 'held',
  }
}

describe('depositSelection', () => {
  it('totals the pick and names its single branch', () => {
    expect(depositSelection([row(4, 1, '100.10'), row(9, 1, '200.20')])).toEqual({
      ids: [4, 9],
      branchId: 1,
      mixedBranches: false,
      amount: 300.3,
    })
  })

  it('flags a pick that spans branches (a batch is single-branch)', () => {
    const sel = depositSelection([row(4, 1, '100'), row(9, 2, '100')])
    expect(sel.mixedBranches).toBe(true)
    expect(sel.branchId).toBeNull()
  })

  it('is empty for no pick', () => {
    expect(depositSelection([])).toEqual({
      ids: [],
      branchId: null,
      mixedBranches: false,
      amount: 0,
    })
  })
})

describe('deposit hand-off query', () => {
  it('round-trips through the URL', () => {
    const query = depositQuery(depositSelection([row(4, 2, '1'), row(9, 2, '1')]))
    expect(query).toEqual({ branchId: '2', giroIds: '4,9' })
    expect(parseDepositQuery(query)).toEqual({ branchId: 2, giroIds: [4, 9] })
  })

  it('ignores junk, duplicates and a missing branch', () => {
    expect(parseDepositQuery({ giroIds: '4, x,4,-1,9,' })).toEqual({
      branchId: null,
      giroIds: [4, 9],
    })
    expect(parseDepositQuery({})).toEqual({ branchId: null, giroIds: [] })
  })
})
