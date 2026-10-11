import { describe, expect, it } from 'vitest'
import { ApiError } from '@/types/api.type'
import type { MslUnit } from '@/types/mustSellList.type'
import {
  buildCreatePayload,
  buildUpdatePayload,
  errorField,
  fieldLocks,
  fromApiItem,
  isValidMinQty,
  toBase,
  toDisplay,
  translateMslError,
  unitOf,
  type FormItem,
  type FormState,
} from './mustSellListHelpers'

const PCS: MslUnit = { uomId: 1, name: 'PCS', symbol: 'pcs', factorToBase: '1', isBase: true }
const PAK: MslUnit = { uomId: 2, name: 'PAK', symbol: 'pak', factorToBase: '5', isBase: false }
const CTN: MslUnit = { uomId: 3, name: 'CTN', symbol: 'ctn', factorToBase: '40', isBase: false }

function item(over: Partial<FormItem> = {}): FormItem {
  return {
    key: 'k',
    productId: 10,
    code: 'P-1',
    name: 'Soto',
    units: [PCS, PAK, CTN],
    uomId: null,
    ...over,
  }
}

function state(over: Partial<FormState> = {}): FormState {
  return {
    code: ' MSL-9 ',
    branchId: 4,
    name: ' Core range ',
    principalOptionId: 7,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    notes: '  ',
    scopeAll: false,
    scopeValueIds: [3, 4],
    showInCanvass: false,
    items: [item({ productId: 1 }), item({ productId: 2, id: 22, uomId: 2, minQty: '10' })],
    ...over,
  }
}

describe('min qty conversion', () => {
  it('converts base to the suggested unit and back', () => {
    expect(toDisplay('10', PAK)).toBe(2)
    expect(toBase(2, PAK)).toBe('10')
    expect(toDisplay('80', CTN)).toBe(2)
    expect(toBase(2, CTN)).toBe('80')
  })

  it('round-trips through 4 decimal rounding', () => {
    expect(toBase(0.33333, PAK)).toBe('1.6667')
    expect(toDisplay('1.6667', PAK)).toBe(0.3333)
  })

  it('keeps an empty quantity empty, never zero', () => {
    expect(toDisplay(undefined, PAK)).toBeNull()
    expect(toDisplay('', PAK)).toBeNull()
    expect(toBase(null, PAK)).toBeUndefined()
  })

  it('treats the base unit as factor 1', () => {
    expect(unitOf(item({ uomId: 1 }))).toBeUndefined()
    expect(unitOf(item({ uomId: null }))).toBeUndefined()
    expect(unitOf(item({ uomId: 2 }))).toEqual(PAK)
    expect(toDisplay('7', unitOf(item({ uomId: 1 })))).toBe(7)
  })

  it('shows the base unit when the suggested unit left the group', () => {
    expect(unitOf(item({ uomId: 99 }))).toBeUndefined()
  })

  it('switching unit keeps the stored base quantity', () => {
    const it1 = item({ uomId: 2, minQty: '10' })
    expect(toDisplay(it1.minQty, unitOf(it1))).toBe(2)
    it1.uomId = 3
    expect(it1.minQty).toBe('10')
    expect(toDisplay(it1.minQty, unitOf(it1))).toBe(0.25)
  })

  it('validates min qty', () => {
    expect(isValidMinQty(undefined)).toBe(true)
    expect(isValidMinQty('')).toBe(true)
    expect(isValidMinQty('0.5')).toBe(true)
    expect(isValidMinQty('0')).toBe(false)
    expect(isValidMinQty('-1')).toBe(false)
  })
})

describe('field locks', () => {
  it('locks nothing on create or draft', () => {
    for (const s of [undefined, 'draft' as const]) {
      expect(fieldLocks(s)).toEqual({
        all: false,
        principal: false,
        startDate: false,
        endDateFromToday: false,
      })
    }
  })

  it('locks the principal once scheduled', () => {
    expect(fieldLocks('scheduled')).toMatchObject({ principal: true, startDate: false })
  })

  it('locks principal and start when active, and bounds the end date', () => {
    expect(fieldLocks('active')).toMatchObject({
      principal: true,
      startDate: true,
      endDateFromToday: true,
      all: false,
    })
  })

  it('locks everything when ended', () => {
    expect(fieldLocks('ended').all).toBe(true)
  })
})

describe('payloads', () => {
  it('maps item order, omits empty uomId and minQty, and trims text', () => {
    const body = buildCreatePayload(state())
    expect(body.code).toBe('MSL-9')
    expect(body.name).toBe('Core range')
    expect(body.notes).toBeUndefined()
    expect(body.items).toEqual([{ productId: 1 }, { id: 22, productId: 2, uomId: 2, minQty: '10' }])
  })

  it('omits the code in auto mode', () => {
    expect(buildCreatePayload(state({ code: '' })).code).toBeUndefined()
    expect(buildCreatePayload(state({ code: undefined })).code).toBeUndefined()
  })

  it('strips code and branch on update and carries the version', () => {
    const body = buildUpdatePayload(state(), 5) as unknown as Record<string, unknown>
    expect(body.version).toBe(5)
    expect('code' in body).toBe(false)
    expect('branchId' in body).toBe(false)
  })

  it('sends no values with "all"', () => {
    expect(buildCreatePayload(state({ scopeAll: true })).scopeValueIds).toEqual([])
  })

  it('reads an omitted unit and min qty as base and any', () => {
    const f = fromApiItem({
      id: 1,
      productId: 2,
      code: 'c',
      name: 'n',
      sortOrder: 1,
    })
    expect(f.uomId).toBeNull()
    expect(f.minQty).toBeUndefined()
    expect(f.units).toEqual([])
  })
})

describe('errors', () => {
  const messages: Record<string, string> = { 'mustSellLists.errors.MSL_STALE': 'stale' }
  const t = (k: string) => messages[k]
  const exists = (k: string) => k in messages

  it('translates a known code', () => {
    const e = translateMslError(new ApiError('x', 409, 'MSL_STALE'), t, exists) as Error
    expect(e.message).toBe('stale')
  })

  it('leaves unknown codes and plain errors alone', () => {
    const unknown = new ApiError('x', 400, 'MSL_OTHER')
    expect(translateMslError(unknown, t, exists)).toBe(unknown)
    const plain = new Error('boom')
    expect(translateMslError(plain, t, exists)).toBe(plain)
  })

  it('shows a duplicate code on the code field', () => {
    expect(errorField('MSL_CODE_DUPLICATE')).toBe('code')
    expect(errorField('MSL_STALE')).toBeUndefined()
  })
})
