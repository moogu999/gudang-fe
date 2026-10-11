import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/api.type'
import en from '@/i18n/locales/en-US'
import id from '@/i18n/locales/id-ID'
import {
  DISPLAY_TYPE_ERROR_CODES,
  displayTypeErrorField,
  displayTypeErrorKey,
} from './displayTypeErrors'

const lookup = (messages: unknown, key: string) =>
  key
    .split('.')
    .reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], messages)

describe('displayTypeErrors', () => {
  it('has a message in both locales for every code', () => {
    for (const code of DISPLAY_TYPE_ERROR_CODES) {
      const key = displayTypeErrorKey(new ApiError('x', 409, code))!
      expect(typeof lookup(en, key), `${code} en`).toBe('string')
      expect(typeof lookup(id, key), `${code} id`).toBe('string')
    }
  })

  it('puts a duplicate code on the Code field', () => {
    expect(displayTypeErrorField(new ApiError('x', 409, 'DISPLAY_TYPE_CODE_DUPLICATE'))).toBe(
      'code',
    )
  })

  it('shows "in use" in a toast', () => {
    const e = new ApiError('x', 409, 'DISPLAY_TYPE_IN_USE')
    expect(displayTypeErrorKey(e)).toBe('displayTypes.errors.inUse')
    expect(displayTypeErrorField(e)).toBeUndefined()
  })
})
