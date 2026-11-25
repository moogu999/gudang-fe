import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DepotAttendanceService } from './depotAttendance.service'
import ApiService from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ summary: { countsByStatus: { missing: 2 } } })),
  },
}))

const get = vi.mocked(ApiService.get)
beforeEach(() => get.mockClear())

describe('DepotAttendanceService.listUrl', () => {
  it('sends the range and the named filters', () => {
    const [path, qs] = DepotAttendanceService.listUrl({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-19',
      branchId: 3,
      teamId: 7,
      employeeId: 9,
      status: 'missing',
    }).split('?')
    const params = new URLSearchParams(qs)
    expect(path).toBe('/v1/depot-attendances')
    expect(params.get('dateFrom')).toBe('2026-11-01')
    expect(params.get('dateTo')).toBe('2026-11-19')
    expect(params.get('branchId')).toBe('3')
    expect(params.get('teamId')).toBe('7')
    expect(params.get('employeeId')).toBe('9')
    expect(params.get('status')).toBe('missing')
  })

  it('omits unset filters', () => {
    const qs = DepotAttendanceService.listUrl({
      dateFrom: '2026-11-19',
      dateTo: '2026-11-19',
    }).split('?')[1]
    expect([...new URLSearchParams(qs).keys()]).toEqual(['dateFrom', 'dateTo'])
  })
})

describe('DepotAttendanceService.summary', () => {
  it('drops the status filter and asks for one row', async () => {
    const summary = await DepotAttendanceService.summary({
      dateFrom: '2026-11-19',
      dateTo: '2026-11-19',
      status: 'missing',
    })
    const params = new URLSearchParams(get.mock.calls[0]![0].split('?')[1])
    expect(params.has('status')).toBe(false)
    expect(params.get('limit')).toBe('1')
    expect(summary.countsByStatus.missing).toBe(2)
  })
})

describe('DepotAttendanceService.toListQuery', () => {
  it('maps search and page to q and offset', () => {
    const params = new URLSearchParams(
      DepotAttendanceService.toListQuery('search=budi&page=2&limit=10'),
    )
    expect(params.get('q')).toBe('budi')
    expect(params.get('offset')).toBe('10')
  })
})
