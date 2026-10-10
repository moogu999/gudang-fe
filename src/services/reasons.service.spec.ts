import { describe, it, expect, vi, beforeEach } from 'vitest'
import ApiService from './api'
import { ReasonsService } from './reasons.service'

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('ReasonsService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists without a query string by default', async () => {
    await ReasonsService.list()
    expect(ApiService.get).toHaveBeenCalledWith('/v1/reasons')
  })

  it('passes the set filters as query parameters', async () => {
    await ReasonsService.list({ type: 'return', isActive: false, search: 'toko' })
    expect(ApiService.get).toHaveBeenCalledWith(
      '/v1/reasons?type=return&isActive=false&search=toko',
    )
  })

  it('gets one reason', async () => {
    await ReasonsService.get(7)
    expect(ApiService.get).toHaveBeenCalledWith('/v1/reasons/7')
  })

  it('creates with POST', async () => {
    const payload = {
      type: 'return' as const,
      name: 'Rusak',
      forTakingOrder: true,
      forCanvass: false,
      requiresPhoto: false,
      requiresNote: false,
      defaultStockType: 'bad' as const,
    }
    await ReasonsService.create(payload)
    expect(ApiService.post).toHaveBeenCalledWith('/v1/reasons', payload)
  })

  it('updates with PUT', async () => {
    const payload = {
      name: 'Rusak',
      forTakingOrder: true,
      forCanvass: true,
      requiresPhoto: true,
      requiresNote: false,
      isActive: true,
    }
    await ReasonsService.update(3, payload)
    expect(ApiService.put).toHaveBeenCalledWith('/v1/reasons/3', payload)
  })

  it('deletes', async () => {
    await ReasonsService.delete(3)
    expect(ApiService.delete).toHaveBeenCalledWith('/v1/reasons/3')
  })

  it('reorders with the type and ids', async () => {
    await ReasonsService.reorder('skipped_visit', [3, 1, 2])
    expect(ApiService.post).toHaveBeenCalledWith('/v1/reasons/reorder', {
      type: 'skipped_visit',
      ids: [3, 1, 2],
    })
  })
})
