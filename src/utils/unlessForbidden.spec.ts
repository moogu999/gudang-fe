import { describe, it, expect } from 'vitest'
import { ApiError } from '@/types/api.type'
import { unlessForbidden } from './unlessForbidden'

describe('unlessForbidden', () => {
  it('passes a successful result through', async () => {
    await expect(unlessForbidden(Promise.resolve({ id: 1 }))).resolves.toEqual({ id: 1 })
  })

  it('turns a 403 into undefined', async () => {
    await expect(unlessForbidden(Promise.reject(new ApiError('forbidden', 403)))).resolves.toBe(
      undefined,
    )
  })

  it.each([
    ['a 404', new ApiError('not found', 404)],
    ['a 500', new ApiError('boom', 500)],
    ['a network error', new Error('Network Error')],
  ])('still rejects on %s', async (_label, error) => {
    await expect(unlessForbidden(Promise.reject(error))).rejects.toBe(error)
  })
})
