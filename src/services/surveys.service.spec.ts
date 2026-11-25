import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()
vi.mock('./api', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { SurveysService } from './surveys.service'

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: [], meta: {} })
  post.mockReset().mockResolvedValue({})
})

describe('SurveysService.toListQuery', () => {
  it('translates the filters the endpoint reads and drops the rest', () => {
    const params = new URLSearchParams(
      SurveysService.toListQuery(
        [
          'filterBy=branchId&filterOperator=0&filterValue=4',
          'filterBy=principalOptionId&filterOperator=0&filterValue=0',
          'filterBy=type&filterOperator=0&filterValue=stock_check',
          'filterBy=frequency&filterOperator=0&filterValue=every_visit',
          'filterBy=status&filterOperator=0&filterValue=current',
          'filterBy=nonsense&filterOperator=0&filterValue=1',
          'search=price&page=2&limit=10&sortBy=name',
        ].join('&'),
      ),
    )

    expect(params.get('branchId')).toBe('4')
    // 0 is "Internal": it must survive.
    expect(params.get('principalOptionId')).toBe('0')
    expect(params.get('type')).toBe('stock_check')
    expect(params.get('frequency')).toBe('every_visit')
    expect(params.get('status')).toBe('current')
    expect(params.has('nonsense')).toBe(false)
    expect(params.get('q')).toBe('price')
    expect(params.get('offset')).toBe('10')
    expect(params.has('sortBy')).toBe(false)
  })
})

describe('SurveysService requests', () => {
  it('sends the version with every transition', async () => {
    await SurveysService.publish(3, 5)
    await SurveysService.unpublish(3, 6)
    await SurveysService.endEarly(3, 7)

    expect(post).toHaveBeenNthCalledWith(1, '/v1/surveys/3/publish', { version: 5 })
    expect(post).toHaveBeenNthCalledWith(2, '/v1/surveys/3/unpublish', { version: 6 })
    expect(post).toHaveBeenNthCalledWith(3, '/v1/surveys/3/end-early', { version: 7 })
  })

  it('customers: sends the scope as a comma list and only what is set', async () => {
    await SurveysService.customers({
      branchId: 2,
      scopeLevel: 'channel',
      scopeAll: false,
      scopeValueIds: [4, 5],
      limit: 20,
      offset: 40,
    })

    const url = get.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(url.startsWith('/v1/surveys/customers?')).toBe(true)
    expect(params.get('scopeLevel')).toBe('channel')
    expect(params.get('scopeValueIds')).toBe('4,5')
    expect(params.has('scopeAll')).toBe(false)
    expect(params.get('offset')).toBe('40')
  })

  it('productOptions: sends no principal when there is none', async () => {
    await SurveysService.productOptions({ categoryOptionId: 9, all: true })

    const url = get.mock.calls[0][0] as string
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.has('principalOptionId')).toBe(false)
    expect(params.get('categoryOptionId')).toBe('9')
    expect(params.get('all')).toBe('true')
  })

  it('competitorGridPreview: unwraps the data array, tolerating an omitted one', async () => {
    get.mockResolvedValueOnce({ data: [{ competitorProductId: 1 }] })
    expect(await SurveysService.competitorGridPreview([1, 2])).toHaveLength(1)
    expect(get.mock.calls[0][0]).toBe('/v1/surveys/competitor-grid-preview?categoryOptionIds=1%2C2')

    get.mockResolvedValueOnce({})
    expect(await SurveysService.competitorGridPreview([1])).toEqual([])
  })

  it('salesTeamOptions: unwraps the data array', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 1, code: 'TM', name: 'T', memberCount: 3 }] })
    const teams = await SurveysService.salesTeamOptions(5, 'tm')
    expect(teams[0].memberCount).toBe(3)
    expect(get.mock.calls[0][0]).toBe('/v1/surveys/sales-team-options?branchId=5&q=tm')
  })
})
