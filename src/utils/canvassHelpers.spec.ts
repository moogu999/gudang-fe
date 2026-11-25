import { describe, it, expect } from 'vitest'
import {
  formatBaseQty,
  lineChange,
  loadingStatusSeverity,
  qtyToString,
  toQty,
  unloadingShortage,
} from './canvassHelpers'
import type { PinnedUom } from '@/types'

const ctnPcs: PinnedUom = {
  uomGroupId: 1,
  name: 'CTN-PCS',
  levels: [
    { levelOrder: 1, uomId: 1, symbol: 'CTN', qtyPerParent: null },
    { levelOrder: 2, uomId: 2, symbol: 'PCS', qtyPerParent: 12 },
  ],
}

describe('lineChange', () => {
  it('is null on an unchanged line', () => {
    expect(lineChange({ changed: false })).toBeNull()
  })
  it('is new when the previous revision had no such product', () => {
    expect(lineChange({ changed: true })).toBe('new')
  })
  it('is changed when the quantity differs from the previous revision', () => {
    expect(lineChange({ changed: true, previousQuantity: '24' })).toBe('changed')
  })
})

describe('unloadingShortage', () => {
  it('is expected less returned', () => {
    expect(unloadingShortage('30', '25')).toBe(5)
  })
  it('is zero when everything came back', () => {
    expect(unloadingShortage('30', '30')).toBe(0)
  })
  it('never goes negative', () => {
    expect(unloadingShortage('10', '12')).toBe(0)
  })
  it('treats missing values as zero', () => {
    expect(unloadingShortage(undefined, undefined)).toBe(0)
  })
})

describe('quantity formatting', () => {
  it('splits a multi-level quantity into tiers', () => {
    expect(formatBaseQty('30', ctnPcs)).toBe('2 / 6')
  })
  it('prints a plain number without a UOM group', () => {
    expect(formatBaseQty('1500')).toBe('1,500')
  })
  it('parses and serializes decimals', () => {
    expect(toQty('abc')).toBe(0)
    expect(qtyToString(2.00001)).toBe('2')
  })
})

describe('loadingStatusSeverity', () => {
  it('flags a rejection as danger', () => {
    expect(loadingStatusSeverity('rejected')).toBe('danger')
  })
})
