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

import { MustSellListsService } from './mustSellLists.service'

beforeEach(() => {
  get.mockReset().mockResolvedValue({ data: [], meta: {} })
  post.mockReset().mockResolvedValue({})
})

describe('MustSellListsService.toListQuery', () => {
  function adapted(queryString: string): URLSearchParams {
    return new URLSearchParams(MustSellListsService.toListQuery(queryString))
  }

  it('translates the filters the endpoint reads by name', () => {
    const params = adapted(
      [
        'filterBy=branchId&filterOperator=0&filterValue=4',
        'filterBy=principalOptionId&filterOperator=0&filterValue=7',
        'filterBy=scopeOptionId&filterOperator=0&filterValue=3',
        'filterBy=status&filterOperator=0&filterValue=current',
        'filterBy=nonsense&filterOperator=0&filterValue=1',
      ].join('&'),
    )

    expect(params.get('branchId')).toBe('4')
    expect(params.get('principalOptionId')).toBe('7')
    expect(params.get('scopeOptionId')).toBe('3')
    expect(params.get('status')).toBe('current')
    expect(params.has('nonsense')).toBe(false)
  })

  it('renames the search term and converts the page to an offset', () => {
    const params = adapted('search=indo&page=3&limit=10')

    expect(params.get('q')).toBe('indo')
    expect(params.get('offset')).toBe('20')
    expect(params.has('search')).toBe(false)
  })

  it('drops parameters the endpoint does not read, such as sort', () => {
    expect(adapted('sortBy=code&sortOperator=asc').has('sortBy')).toBe(false)
  })
})

describe('MustSellListsService transitions', () => {
  it('posts the loaded version to publish, unpublish and end early', async () => {
    await MustSellListsService.publish(5, 3)
    await MustSellListsService.unpublish(5, 4)
    await MustSellListsService.endEarly(5, 6)

    expect(post).toHaveBeenNthCalledWith(1, '/v1/must-sell-lists/5/publish', { version: 3 })
    expect(post).toHaveBeenNthCalledWith(2, '/v1/must-sell-lists/5/unpublish', { version: 4 })
    expect(post).toHaveBeenNthCalledWith(3, '/v1/must-sell-lists/5/end-early', { version: 6 })
  })

  it('duplicates and previews through their own routes', async () => {
    await MustSellListsService.duplicate(9)
    const body = { branchId: 1, scopeAll: true, scopeValueIds: [], items: [] }
    await MustSellListsService.preview(body)

    expect(post).toHaveBeenNthCalledWith(1, '/v1/must-sell-lists/9/duplicate', {})
    expect(post).toHaveBeenNthCalledWith(2, '/v1/must-sell-lists/preview', body)
  })
})

describe('MustSellListsService reads', () => {
  it('sends the scope of a customers query as a comma list', async () => {
    await MustSellListsService.customers({
      branchId: 2,
      scopeLevel: 'channel',
      scopeAll: false,
      scopeValueIds: [3, 4],
      limit: 20,
      offset: 40,
    })

    const url = new URL(get.mock.calls[0][0] as string, 'http://x')
    expect(url.pathname).toBe('/v1/must-sell-lists/customers')
    expect(url.searchParams.get('scopeLevel')).toBe('channel')
    expect(url.searchParams.get('scopeValueIds')).toBe('3,4')
    expect(url.searchParams.has('scopeAll')).toBe(false)
    expect(url.searchParams.get('offset')).toBe('40')
  })

  it('asks for the whole category with all=true', async () => {
    await MustSellListsService.productOptions({
      principalOptionId: 7,
      categoryOptionId: 11,
      excludeIds: [1, 2],
      all: true,
    })

    const url = new URL(get.mock.calls[0][0] as string, 'http://x')
    expect(url.pathname).toBe('/v1/must-sell-lists/product-options')
    expect(url.searchParams.get('principalOptionId')).toBe('7')
    expect(url.searchParams.get('categoryOptionId')).toBe('11')
    expect(url.searchParams.get('excludeIds')).toBe('1,2')
    expect(url.searchParams.get('all')).toBe('true')
  })
})
