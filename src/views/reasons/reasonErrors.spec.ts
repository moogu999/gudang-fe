import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/api.type'
import { reasonErrorKey } from './reasonErrors'

describe('reasonErrorKey', () => {
  it('maps known codes to i18n keys', () => {
    expect(reasonErrorKey(new ApiError('x', 409, 'last_active_reason'))).toBe(
      'reasons.errors.lastActiveReason',
    )
    expect(reasonErrorKey(new ApiError('x', 409, 'reason_in_use'))).toBe('reasons.errors.inUse')
  })

  it('ignores unknown codes and non-API errors', () => {
    expect(reasonErrorKey(new ApiError('x', 500, 'boom'))).toBeUndefined()
    expect(reasonErrorKey(new ApiError('x', 500))).toBeUndefined()
    expect(reasonErrorKey(new Error('x'))).toBeUndefined()
  })
})
