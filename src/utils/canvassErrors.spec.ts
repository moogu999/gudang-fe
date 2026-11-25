import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/api.type'
import { canvassErrorItemLines, translateCanvassError } from './canvassErrors'

const messages: Record<string, string> = {
  'canvass.errors.insufficientStock': 'Not enough stock.',
  'canvass.errors.shortageLine': '{product}: requested {requested}, available {available}',
  'canvass.errors.excessLine': '{product} ({stockType}): returning {returned}, holds {onHand}',
  'canvass.errors.andMore': '… and {n} more',
  'canvassUnloadings.stockTypes.bad': 'Bad',
}
const t = (key: string, params: Record<string, unknown> = {}) =>
  (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))

const shortage = (n: number) =>
  new ApiError('x', 422, 'CANVASS_LOADING_INSUFFICIENT_STOCK', {
    items: Array.from({ length: n }, (_, i) => ({
      productId: i + 1,
      code: `P${i + 1}`,
      name: `Item ${i + 1}`,
      requested: '24',
      available: '10',
    })),
  })

describe('canvass error details', () => {
  it('lists each short product under the translated message', () => {
    const e = translateCanvassError(shortage(2), t) as Error
    expect(e.message).toBe(
      'Not enough stock.\nP1 Item 1: requested 24, available 10\nP2 Item 2: requested 24, available 10',
    )
  })

  it('caps a long list and says how many were left out', () => {
    const lines = canvassErrorItemLines(shortage(8), t)
    expect(lines).toHaveLength(6)
    expect(lines.at(-1)).toBe('… and 3 more')
  })

  it('names the stock type of an over-returned line', () => {
    const e = new ApiError('x', 422, 'CANVASS_UNLOADING_EXCEEDS_VAN_STOCK', {
      items: [{ productId: 1, code: 'P1', stockType: 'bad', returned: '5', onHand: '3' }],
    })
    expect(canvassErrorItemLines(e, t)).toEqual(['P1 (Bad): returning 5, holds 3'])
  })

  it('adds nothing when the error carries no items', () => {
    const e = new ApiError('x', 422, 'CANVASS_LOADING_INSUFFICIENT_STOCK')
    expect(canvassErrorItemLines(e, t)).toEqual([])
  })
})
