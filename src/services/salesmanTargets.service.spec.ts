import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SalesmanTargetsService } from './salesmanTargets.service'
import ApiService from './api'

// The list route ignores parameters it doesn't read, so a misspelt one still
// answers 200 with the wrong rows. Asserting on the URL is the only way to see it.
vi.mock('./api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [], meta: { total: 0, limit: 10, offset: 0 } })),
    post: vi.fn(() => Promise.resolve({})),
  },
}))

const get = vi.mocked(ApiService.get)
const post = vi.mocked(ApiService.post)

function lastGet(): { path: string; params: URLSearchParams } {
  const url = get.mock.calls.at(-1)?.[0] as string
  const [path, qs] = url.split('?')
  return { path: path!, params: new URLSearchParams(qs ?? '') }
}

beforeEach(() => {
  get.mockClear()
  post.mockClear()
})

describe('SalesmanTargetsService.toListQuery', () => {
  it('keeps the named filters and drops everything else', () => {
    const qs = SalesmanTargetsService.toListQuery(
      'search=tgt&page=2&limit=10&sortBy=code&sortOperator=asc' +
        '&filterBy=period&filterOperator=0&filterValue=2026-10-01' +
        '&filterBy=status&filterOperator=0&filterValue=active' +
        '&filterBy=unknown&filterOperator=0&filterValue=x',
    )
    const params = new URLSearchParams(qs)
    expect(params.get('q')).toBe('tgt')
    expect(params.get('offset')).toBe('10')
    expect(params.get('period')).toBe('2026-10-01')
    expect(params.get('status')).toBe('active')
    expect(params.has('unknown')).toBe(false)
    expect(params.has('sortBy')).toBe(false)
  })
})

describe('SalesmanTargetsService', () => {
  it('sends the candidate key, and the document to leave out', async () => {
    await SalesmanTargetsService.candidates({
      branchId: 2,
      period: '2026-10-01',
      source: 'principal',
      principalOptionId: 9,
      excludeTargetId: 4,
    })
    const { path, params } = lastGet()
    expect(path).toBe('/v1/salesman-targets/candidates')
    expect(Object.fromEntries(params)).toEqual({
      branchId: '2',
      period: '2026-10-01',
      source: 'principal',
      principalOptionId: '9',
      excludeTargetId: '4',
    })
  })

  it('sends the item options query', async () => {
    await SalesmanTargetsService.itemOptions({
      branchId: 2,
      level: 'category',
      q: 'mi',
      limit: 10,
      offset: 20,
    })
    const { path, params } = lastGet()
    expect(path).toBe('/v1/salesman-targets/item-options')
    expect(Object.fromEntries(params)).toEqual({
      branchId: '2',
      level: 'category',
      q: 'mi',
      limit: '10',
      offset: '20',
    })
  })

  it('sends the version a transition was loaded at', async () => {
    await SalesmanTargetsService.activate(5, 3)
    expect(post).toHaveBeenCalledWith('/v1/salesman-targets/5/activate', { version: 3 })
    await SalesmanTargetsService.close(5, 4)
    expect(post).toHaveBeenCalledWith('/v1/salesman-targets/5/close', { version: 4 })
  })
})

describe('SalesmanTargetsService achievement calls', () => {
  it('reads the achievement of one document', async () => {
    await SalesmanTargetsService.achievement(7)
    expect(lastGet().path).toBe('/v1/salesman-targets/7/achievement')
  })

  it('narrows an item breakdown to one salesman only when given one', async () => {
    await SalesmanTargetsService.achievementItem(7, 3)
    expect(lastGet().path).toBe('/v1/salesman-targets/7/achievement/items/3')
    expect(lastGet().params.has('employeeId')).toBe(false)

    await SalesmanTargetsService.achievementItem(7, 3, 12)
    expect(lastGet().params.get('employeeId')).toBe('12')
  })

  it('joins the summary ids with commas', async () => {
    await SalesmanTargetsService.achievementSummaries([4, 5, 6])
    expect(lastGet().path).toBe('/v1/salesman-targets/achievement-summaries')
    expect(lastGet().params.get('ids')).toBe('4,5,6')
  })
})
