import { describe, it, expect } from 'vitest'
import {
  buildPayload,
  columnTotals,
  parseNumber,
  parseTsv,
  principalGap,
  splitEvenly,
  toBase,
  toDisplay,
  unitOf,
  type FormItem,
  type FormLine,
} from './salesmanTargetGrid'
import type { TargetUnit } from '@/types/salesmanTarget.type'

const CTN: TargetUnit = {
  uomId: 2,
  name: 'Carton',
  symbol: 'CTN',
  factorToBase: '40',
  isBase: false,
}
const PCS: TargetUnit = { uomId: 1, name: 'Pcs', symbol: 'PCS', factorToBase: '1', isBase: true }

function item(key: string, overrides: Partial<FormItem> = {}): FormItem {
  return { key, uomId: null, units: [], alsoIn: [], ...overrides }
}

function line(employeeId: number, overrides: Partial<FormLine> = {}): FormLine {
  return {
    key: `l${employeeId}`,
    employeeId,
    employeeName: `E${employeeId}`,
    employeeTypeName: 'Salesman',
    employeeActive: true,
    teamCodes: [],
    principals: [],
    isNew: false,
    targetValue: null,
    effectiveCall: null,
    activeOutlet: null,
    cells: {},
    ...overrides,
  }
}

describe('unit conversion', () => {
  it('treats the base unit and a missing unit as factor 1', () => {
    expect(unitOf({ uomId: null, units: [PCS, CTN] })).toBeUndefined()
    expect(unitOf({ uomId: 1, units: [PCS, CTN] })).toBeUndefined()
    expect(unitOf({ uomId: 2, units: [PCS, CTN] })).toBe(CTN)
  })

  it('round-trips 1.5 CTN through the base quantity', () => {
    const base = toBase(1.5, CTN)
    expect(base).toBe('60')
    expect(toDisplay(base, CTN)).toBe(1.5)
  })

  it('keeps an empty cell empty, and 0 as 0', () => {
    expect(toBase(null, CTN)).toBeUndefined()
    expect(toDisplay(undefined, CTN)).toBeNull()
    expect(toBase(0, CTN)).toBe('0')
    expect(toDisplay('0', CTN)).toBe(0)
  })

  it('rounds the base quantity to the 4 decimals the API stores', () => {
    expect(toBase(0.123456, undefined)).toBe('0.1235')
  })
})

describe('columnTotals', () => {
  it('ignores missing cells instead of counting them as zero', () => {
    const lines = [
      line(1, { targetValue: 100, effectiveCall: 4, cells: { a: '10' } }),
      line(2, { targetValue: null, activeOutlet: 3, cells: { a: '5', b: '1.5' } }),
      line(3),
    ]
    expect(columnTotals(lines, ['a', 'b'])).toEqual({
      value: 100,
      effectiveCall: 4,
      activeOutlet: 3,
      qty: { a: 15, b: 1.5 },
    })
  })
})

describe('principalGap', () => {
  it('is negative when short, with its percentage', () => {
    const gap = principalGap(2_580_000_000, 2_600_000_000)!
    expect(gap.amount).toBe(-20_000_000)
    expect(gap.pct).toBeCloseTo(-0.769, 2)
  })

  it('is positive when over, and null without a target', () => {
    expect(principalGap(110, 100)!.amount).toBe(10)
    expect(principalGap(110, null)).toBeNull()
    expect(principalGap(110, 0)).toBeNull()
  })
})

describe('splitEvenly', () => {
  it('puts the remainder on the last share', () => {
    expect(splitEvenly(100, 3)).toEqual([33, 33, 34])
  })

  it('handles an exact split and no lines', () => {
    expect(splitEvenly(90, 3)).toEqual([30, 30, 30])
    expect(splitEvenly(90, 0)).toEqual([])
  })
})

describe('parseNumber', () => {
  it.each([
    ['480000000', 480000000],
    ['480.000.000', 480000000],
    ['480,000,000', 480000000],
    ['1.200', 1200],
    ['1,200', 1200],
    ['12.5', 12.5],
    ['12,5', 12.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['Rp 1.500.000', 1500000],
  ])('reads %s as %s', (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected)
  })

  it('rejects text and malformed groups', () => {
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('1.2345')).toBeNull()
  })
})

describe('parseTsv', () => {
  it('splits rows and columns and reads blanks as empty', () => {
    expect(parseTsv('1\t2\t\n3\t\t4')).toEqual([
      [1, 2, null],
      [3, null, 4],
    ])
  })

  it('handles CRLF and a trailing newline', () => {
    expect(parseTsv('1\t2\r\n3\t4\r\n')).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('marks negatives and non-numbers invalid', () => {
    expect(parseTsv('-5\tabc\t7')).toEqual([['invalid', 'invalid', 7]])
  })

  it('returns nothing for empty text', () => {
    expect(parseTsv('')).toEqual([])
    expect(parseTsv('\n')).toEqual([])
  })
})

describe('buildPayload', () => {
  const items = [
    item('7', { id: 7, categoryOptionId: 11, uomId: 2, units: [PCS, CTN] }),
    item('k-new', { categoryOptionId: 12, principalOptionId: 5 }),
  ]
  const lines = [
    line(1, {
      targetValue: 1000,
      effectiveCall: 4,
      activeOutlet: 2,
      cells: { '7': '60', 'k-new': '0' },
    }),
    line(2),
  ]
  const all = { hasValue: true, hasQty: true, hasEffectiveCall: true, hasActiveOutlet: true }

  it('maps saved items by id and new ones by key', () => {
    const body = buildPayload(3, all, null, '', items, lines, 'internal', 'category')
    expect(body.version).toBe(3)
    expect(body.items).toEqual([
      {
        id: 7,
        key: undefined,
        productId: undefined,
        categoryOptionId: 11,
        principalOptionId: undefined,
        uomId: 2,
      },
      {
        id: undefined,
        key: 'k-new',
        productId: undefined,
        categoryOptionId: 12,
        principalOptionId: 5,
        uomId: null,
      },
    ])
    expect(body.lines![0]!.cells).toEqual({ '7': '60', 'k-new': '0' })
    expect(body.lines![1]).toMatchObject({ targetValue: null, effectiveCall: null, cells: {} })
  })

  it('strips the columns of switched-off types', () => {
    const body = buildPayload(
      1,
      { hasValue: false, hasQty: false, hasEffectiveCall: false, hasActiveOutlet: true },
      null,
      '',
      items,
      lines,
      'internal',
      'category',
    )
    expect(body.items).toEqual([])
    expect(body.lines![0]).toMatchObject({
      targetValue: null,
      effectiveCall: null,
      activeOutlet: 2,
      cells: {},
    })
  })

  it('only sends a principal target and qualifiers where they apply', () => {
    const principal = buildPayload(1, all, 500, '  note ', items, lines, 'principal', 'category')
    expect(principal.principalTargetValue).toBe('500')
    expect(principal.notes).toBe('note')
    expect(principal.items![1]!.principalOptionId).toBeUndefined()

    const internal = buildPayload(1, all, 500, '', items, lines, 'internal', 'category')
    expect(internal.principalTargetValue).toBeNull()
    expect(internal.notes).toBeNull()
  })
})
