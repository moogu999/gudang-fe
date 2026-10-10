import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SalesTeamsService } from './salesTeams.service'
import ApiService from './api'

// The sales team routes ignore parameters they don't read, so a misspelt one
// still answers 200 with the wrong rows. Asserting on the URL is the only way
// to see the difference.
vi.mock('./api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [], meta: { total: 0, limit: 10, offset: 0 } })),
    post: vi.fn(() => Promise.resolve({})),
    put: vi.fn(() => Promise.resolve({})),
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

describe('SalesTeamsService.toListQuery', () => {
  it('turns the table dialect into q/limit/offset and keeps the named filters', () => {
    const qs = SalesTeamsService.toListQuery(
      'search=tm&page=3&limit=10&sortBy=code&sortOperator=asc' +
        '&filterBy=branchId&filterOperator=0&filterValue=2' +
        '&filterBy=unknown&filterOperator=0&filterValue=x',
    )
    const params = new URLSearchParams(qs)
    expect(params.get('q')).toBe('tm')
    expect(params.get('offset')).toBe('20')
    expect(params.get('branchId')).toBe('2')
    expect(params.has('unknown')).toBe(false)
    expect(params.has('sortBy')).toBe(false)
  })
})

describe('SalesTeamsService.pickerCandidates', () => {
  it('sends the segment and the selected tree node', async () => {
    await SalesTeamsService.pickerCandidates(5, {
      segment: 'uncovered',
      principalOptionId: 7,
      categoryOptionId: 9,
      limit: 100,
      offset: 200,
    })
    const { path, params } = lastGet()
    expect(path).toBe('/v1/sales-teams/5/product-picker/candidates')
    expect(params.get('segment')).toBe('uncovered')
    expect(params.get('principalOptionId')).toBe('7')
    expect(params.get('categoryOptionId')).toBe('9')
    expect(params.get('limit')).toBe('100')
    expect(params.get('offset')).toBe('200')
  })

  it('asks for the unlabelled bucket with noPrincipal/noCategory', async () => {
    await SalesTeamsService.pickerCandidates(5, {
      segment: 'notInTeam',
      noPrincipal: true,
      noCategory: true,
    })
    const { params } = lastGet()
    expect(params.get('noPrincipal')).toBe('true')
    expect(params.get('noCategory')).toBe('true')
    expect(params.has('principalOptionId')).toBe(false)
  })

  it('prefers the option id over the unlabelled flag', async () => {
    await SalesTeamsService.pickerCandidates(5, {
      segment: 'all',
      principalOptionId: 3,
      noPrincipal: true,
    })
    const { params } = lastGet()
    expect(params.get('principalOptionId')).toBe('3')
    expect(params.has('noPrincipal')).toBe(false)
  })
})

describe('SalesTeamsService.pickerTree', () => {
  it('unwraps the data envelope', async () => {
    get.mockResolvedValueOnce({ data: [{ count: 2, categories: [] }] })
    const nodes = await SalesTeamsService.pickerTree(5, 'all')
    expect(nodes).toEqual([{ count: 2, categories: [] }])
    expect(lastGet().params.get('segment')).toBe('all')
  })
})

describe('SalesTeamsService members', () => {
  it('adds a member with the move flag and a calendar date', async () => {
    await SalesTeamsService.addMember(5, { employeeId: 11, startDate: '2026-10-10', move: true })
    expect(post).toHaveBeenCalledWith('/v1/sales-teams/5/members', {
      employeeId: 11,
      startDate: '2026-10-10',
      move: true,
    })
  })

  it('asks for history only when requested', async () => {
    get.mockResolvedValue({ data: [] })
    await SalesTeamsService.listMembers(5)
    expect(lastGet().params.has('includeHistory')).toBe(false)
    await SalesTeamsService.listMembers(5, true)
    expect(lastGet().params.get('includeHistory')).toBe('true')
  })

  it('translates the picker dialect for member candidates', async () => {
    await SalesTeamsService.memberCandidatesForSelect(5, 'search=budi&page=2&limit=10')
    const { path, params } = lastGet()
    expect(path).toBe('/v1/sales-teams/5/member-candidates')
    expect(params.get('q')).toBe('budi')
    expect(params.get('offset')).toBe('10')
  })
})
