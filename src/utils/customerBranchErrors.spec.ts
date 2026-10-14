import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/api.type'
import { CUSTOMER_BRANCH_ERROR_CODES, translateCustomerBranchError } from './customerBranchErrors'

const t = (key: string) => `t:${key}`

describe('translateCustomerBranchError', () => {
  it('translates every known code', () => {
    for (const code of CUSTOMER_BRANCH_ERROR_CODES) {
      const out = translateCustomerBranchError(new ApiError('raw', 400, code), t)
      expect(out).toBeInstanceOf(Error)
      expect((out as Error).message).toMatch(/^t:/)
    }
  })

  it('passes unknown codes and plain errors through', () => {
    const unknown = new ApiError('raw', 400, 'SOMETHING_ELSE')
    expect(translateCustomerBranchError(unknown, t)).toBe(unknown)
    const plain = new Error('boom')
    expect(translateCustomerBranchError(plain, t)).toBe(plain)
  })
})
