import { describe, it, expect } from 'vitest'
import {
  buildCombinationKey,
  dimensionKey,
  dimensionOptionsFor,
  unmappedCountsByRole,
  isActivatable,
  basisChanged,
} from './journalConfigMatrix'
import type {
  JournalConfigRole,
  JournalDimension,
  JournalMappingValue,
} from '@/types/journalConfig.type'

function role(overrides: Partial<JournalConfigRole> = {}): JournalConfigRole {
  return {
    roleId: 1,
    roleCode: 'revenue',
    roleName: 'Revenue',
    normalSide: 'CREDIT',
    grain: 'LINE',
    bases: [],
    totalRows: 0,
    unmappedRows: 0,
    staleRows: 0,
    ...overrides,
  }
}

describe('dimensionKey', () => {
  it('returns the bare source for a fixed dimension', () => {
    expect(dimensionKey('branch')).toBe('branch')
  })

  it('appends the refId for a label dimension', () => {
    expect(dimensionKey('product_label', 7)).toBe('product_label:7')
  })

  it('ignores a null refId', () => {
    expect(dimensionKey('branch', null)).toBe('branch')
  })
})

describe('buildCombinationKey', () => {
  it('orders segments by position regardless of input order', () => {
    const values: JournalMappingValue[] = [
      { position: 2, source: 'product_label', refId: 7, valueId: 44 },
      { position: 1, source: 'branch', valueId: 12 },
    ]
    expect(buildCombinationKey(values)).toBe('branch=12|product_label:7=44')
  })

  it('renders a null valueId as the "_" not-set marker', () => {
    const values: JournalMappingValue[] = [
      { position: 1, source: 'product_label', refId: 9, valueId: null },
    ]
    expect(buildCombinationKey(values)).toBe('product_label:9=_')
  })

  it('renders an absent valueId as the "_" not-set marker', () => {
    const values: JournalMappingValue[] = [{ position: 1, source: 'branch' }]
    expect(buildCombinationKey(values)).toBe('branch=_')
  })

  it('returns an empty string for the zero-basis case', () => {
    expect(buildCombinationKey([])).toBe('')
  })

  it('matches the master plan example byte for byte', () => {
    const values: JournalMappingValue[] = [
      { position: 1, source: 'branch', valueId: 12 },
      { position: 2, source: 'product_label', refId: 7, valueId: 44 },
      { position: 3, source: 'product_label', refId: 9, valueId: null },
    ]
    expect(buildCombinationKey(values)).toBe('branch=12|product_label:7=44|product_label:9=_')
  })
})

describe('unmappedCountsByRole', () => {
  it('maps each role code to its unmapped row count', () => {
    const roles = [
      role({ roleCode: 'ar', unmappedRows: 0 }),
      role({ roleCode: 'revenue', unmappedRows: 3 }),
    ]
    expect(unmappedCountsByRole(roles)).toEqual({ ar: 0, revenue: 3 })
  })
})

describe('isActivatable', () => {
  it('is false when there are no roles', () => {
    expect(isActivatable({ roles: [] })).toBe(false)
  })

  it('is false when any role has an unmapped row', () => {
    const roles = [
      role({ totalRows: 2, unmappedRows: 0 }),
      role({ roleCode: 'ar', totalRows: 1, unmappedRows: 1 }),
    ]
    expect(isActivatable({ roles })).toBe(false)
  })

  it('is false when a role has zero mapping rows at all', () => {
    const roles = [role({ totalRows: 0, unmappedRows: 0 })]
    expect(isActivatable({ roles })).toBe(false)
  })

  it('is true when every role is fully mapped', () => {
    const roles = [
      role({ totalRows: 2, unmappedRows: 0 }),
      role({ roleCode: 'ar', totalRows: 1, unmappedRows: 0 }),
    ]
    expect(isActivatable({ roles })).toBe(true)
  })
})

describe('basisChanged', () => {
  it('is false for the identical set in a different order', () => {
    const oldBases = [
      { position: 1, source: 'branch' as const },
      { position: 2, source: 'product_label' as const, refId: 7 },
    ]
    const newBases = [
      { position: 2, source: 'product_label' as const, refId: 7 },
      { position: 1, source: 'branch' as const },
    ]
    expect(basisChanged(oldBases, newBases)).toBe(false)
  })

  it('is true when the length differs', () => {
    expect(basisChanged([{ position: 1, source: 'branch' }], [])).toBe(true)
  })

  it('is true when a refId differs at the same position', () => {
    const oldBases = [{ position: 1, source: 'product_label' as const, refId: 7 }]
    const newBases = [{ position: 1, source: 'product_label' as const, refId: 9 }]
    expect(basisChanged(oldBases, newBases)).toBe(true)
  })

  it('treats a null and an absent refId as equal', () => {
    const oldBases = [{ position: 1, source: 'branch' as const, refId: null }]
    const newBases = [{ position: 1, source: 'branch' as const }]
    expect(basisChanged(oldBases, newBases)).toBe(false)
  })
})

describe('dimensionOptionsFor', () => {
  const catalog: JournalDimension[] = [
    { key: 'branch', source: 'branch', label: 'Branch' },
    { key: 'warehouse', source: 'warehouse', label: 'Warehouse' },
    { key: 'product_label:7', source: 'product_label', refId: 7, label: 'Principal' },
  ]

  it('hides dimensions already used in another slot', () => {
    const options = dimensionOptionsFor(catalog, ['branch'])
    expect(options.map((d) => d.key)).toEqual(['warehouse', 'product_label:7'])
  })

  it("keeps the current slot's own selection visible", () => {
    const options = dimensionOptionsFor(catalog, ['branch', 'warehouse'], 'warehouse')
    expect(options.map((d) => d.key)).toEqual(['warehouse', 'product_label:7'])
  })
})
