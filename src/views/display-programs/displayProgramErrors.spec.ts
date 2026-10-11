import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/api.type'
import en from '@/i18n/locales/en-US'
import id from '@/i18n/locales/id-ID'
import {
  DISPLAY_PROGRAM_ERROR_CODES,
  displayProgramErrorCode,
  displayProgramErrorField,
  displayProgramErrorKey,
  translateDisplayProgramError,
} from './displayProgramErrors'

const lookup = (messages: unknown, key: string) =>
  key
    .split('.')
    .reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], messages)

describe('displayProgramErrors', () => {
  it('has a message in both locales for every code', () => {
    for (const code of DISPLAY_PROGRAM_ERROR_CODES) {
      const key = displayProgramErrorKey(code)!
      expect(typeof lookup(en, key), `${code} en`).toBe('string')
      expect(typeof lookup(id, key), `${code} id`).toBe('string')
    }
  })

  it('puts a taken code on the Code field', () => {
    expect(displayProgramErrorField('DISPLAY_PROGRAM_CODE_DUPLICATE')).toBe('code')
    expect(displayProgramErrorField('DISPLAY_PROGRAM_STALE')).toBeUndefined()
  })

  it('translates a known code and leaves other errors alone', () => {
    const known = new ApiError('server english', 409, 'DISPLAY_PROGRAM_FIELD_LOCKED')
    const out = translateDisplayProgramError(known, (k) => `t:${k}`) as Error
    expect(out.message).toBe('t:displayPrograms.errors.fieldLocked')
    const unknown = new ApiError('x', 500, 'SOMETHING_ELSE')
    expect(translateDisplayProgramError(unknown, (k) => k)).toBe(unknown)
    expect(displayProgramErrorCode(new Error('plain'))).toBeUndefined()
  })
})
