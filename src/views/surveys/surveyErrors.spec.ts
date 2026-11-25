import { describe, expect, it } from 'vitest'
import { ApiError } from '@/types/api.type'
import {
  errorField,
  errorLocation,
  isReloadError,
  surveyErrorCode,
  translateSurveyError,
} from './surveyErrors'

const t = (key: string) => `T(${key})`
const exists = (key: string) => key === 'surveys.errors.SURVEY_STALE'

describe('translateSurveyError', () => {
  it('translates a known code and leaves others alone', () => {
    const known = translateSurveyError(new ApiError('x', 409, 'SURVEY_STALE'), t, exists)
    expect((known as Error).message).toBe('T(surveys.errors.SURVEY_STALE)')
    const unknown = new ApiError('x', 400, 'SURVEY_OTHER')
    expect(translateSurveyError(unknown, t, exists)).toBe(unknown)
    expect(translateSurveyError(new Error('plain'), t, exists)).toBeInstanceOf(Error)
  })
})

describe('errorField / reload', () => {
  it('puts code errors on the Code field', () => {
    expect(errorField('SURVEY_CODE_DUPLICATE')).toBe('code')
    expect(errorField('SURVEY_CODE_TOO_LONG')).toBe('code')
    expect(errorField('SURVEY_STALE')).toBeUndefined()
  })

  it('reloads on a locked or unknown id', () => {
    expect(isReloadError('SURVEY_FIELD_LOCKED')).toBe(true)
    expect(isReloadError('SURVEY_UNKNOWN_QUESTION')).toBe(true)
    expect(isReloadError('SURVEY_STALE')).toBe(false)
  })

  it('reads the code of an API error only', () => {
    expect(surveyErrorCode(new ApiError('x', 400, 'C'))).toBe('C')
    expect(surveyErrorCode(new Error('x'))).toBeUndefined()
  })
})

describe('errorLocation', () => {
  it('points an invalid question at its index', () => {
    const e = new ApiError('x', 400, 'SURVEY_INVALID_QUESTION', { index: 2 })
    expect(errorLocation(e)).toEqual({ questionIndex: 2 })
    expect(errorLocation(new ApiError('x', 400, 'SURVEY_INVALID_OPTIONS', { index: 0 }))).toEqual({
      questionIndex: 0,
    })
  })

  it('points an empty grid at its question id', () => {
    const e = new ApiError('x', 409, 'SURVEY_GRID_EMPTY', { questionId: 7 })
    expect(errorLocation(e)).toEqual({ questionId: 7 })
  })

  it('lists the products that do not carry the principal', () => {
    const e = new ApiError('x', 400, 'SURVEY_PRODUCT_PRINCIPAL_MISMATCH', { productIds: [3, 4] })
    expect(errorLocation(e)).toEqual({ productIds: [3, 4] })
  })

  it('has nothing to say about other errors', () => {
    expect(errorLocation(new ApiError('x', 409, 'SURVEY_STALE'))).toEqual({})
    expect(errorLocation(new Error('x'))).toEqual({})
  })
})
