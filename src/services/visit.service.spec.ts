import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VisitService } from './visit.service'
import ApiService from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({ summary: { countsByStatus: { completed: 2 }, outsideRadius: 1 } }),
    ),
  },
}))

const get = vi.mocked(ApiService.get)
beforeEach(() => get.mockClear())

describe('VisitService', () => {
  it('sends the range and the named filters', () => {
    const [path, qs] = VisitService.listUrl({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-19',
      branchId: 3,
      customerId: 5,
      status: 'skipped',
      outsideRadius: true,
    }).split('?')
    const params = new URLSearchParams(qs)
    expect(path).toBe('/v1/visits')
    expect(params.get('dateFrom')).toBe('2026-11-01')
    expect(params.get('branchId')).toBe('3')
    expect(params.get('customerId')).toBe('5')
    expect(params.get('status')).toBe('skipped')
    expect(params.get('outsideRadius')).toBe('true')
  })

  it('reads the summary without the status filters', async () => {
    const s = await VisitService.summary({
      dateFrom: '2026-11-19',
      dateTo: '2026-11-19',
      status: 'skipped',
      outsideRadius: true,
    })
    expect(s.outsideRadius).toBe(1)
    const params = new URLSearchParams((get.mock.calls[0]![0] as string).split('?')[1])
    expect(params.get('limit')).toBe('1')
    expect(params.has('status')).toBe(false)
    expect(params.has('outsideRadius')).toBe(false)
  })
})
