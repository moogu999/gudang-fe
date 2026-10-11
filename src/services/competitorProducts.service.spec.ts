import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
const post = vi.fn()
const put = vi.fn()
vi.mock('./api', () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
    delete: vi.fn(),
  },
}))

import { CompetitorBrandsService } from './competitorBrands.service'
import { CompetitorProductsService } from './competitorProducts.service'
import { CompetitorProductRecommendationsService } from './competitorProductRecommendations.service'

beforeEach(() => vi.clearAllMocks())

describe('CompetitorProductsService', () => {
  it('rewrites the generic query into the endpoint dialect, keeping named filters', () => {
    const qs = CompetitorProductsService.toListQuery(
      'search=mie&page=2&limit=10&filterBy=brandId&filterOperator=0&filterValue=3&filterBy=bogus&filterOperator=0&filterValue=1',
    )
    const params = new URLSearchParams(qs)
    expect(params.get('q')).toBe('mie')
    expect(params.get('offset')).toBe('10')
    expect(params.get('brandId')).toBe('3')
    expect(params.has('bogus')).toBe(false)
  })

  it('turns an InfiniteSelect cursor into the offset', () => {
    const params = new URLSearchParams(CompetitorProductsService.toListQuery('cursor=20&limit=10'))
    expect(params.get('offset')).toBe('20')
    expect(params.get('limit')).toBe('10')
  })

  it('lists with named parameters', async () => {
    get.mockResolvedValue({ data: [], meta: { total: 0, limit: 20, offset: 0 } })
    await CompetitorProductsService.query({ brandId: 3, isActive: true, search: undefined })
    expect(get).toHaveBeenCalledWith('/v1/competitor-products?brandId=3&isActive=true')
  })

  it('replaces a product with PUT', async () => {
    const payload = { name: 'X', brandId: 1, categoryOptionId: 2, uomGroupId: 3, comparisons: [] }
    await CompetitorProductsService.update(5, payload)
    expect(put).toHaveBeenCalledWith('/v1/competitor-products/5', payload)
  })
})

describe('CompetitorBrandsService', () => {
  it('translates an InfiniteSelect query into search and isActive', async () => {
    get.mockResolvedValue({ data: [], meta: { total: 0, limit: 20, offset: 0 } })
    await CompetitorBrandsService.listForSelect(
      'search=indo&filterBy=isActive&filterOperator=0&filterValue=true',
    )
    expect(get).toHaveBeenCalledWith('/v1/competitor-brands?isActive=true&search=indo')
  })
})

describe('CompetitorProductRecommendationsService', () => {
  it('lists pending recommendations with offset paging', async () => {
    get.mockResolvedValue({ data: [], meta: { total: 0, limit: 1, offset: 0 } })
    await CompetitorProductRecommendationsService.list({ status: 'pending', limit: 1 })
    expect(get).toHaveBeenCalledWith(
      '/v1/competitor-product-recommendations?status=pending&limit=1',
    )
  })

  it('sends the merge body', async () => {
    await CompetitorProductRecommendationsService.merge(9, [1, 2])
    expect(post).toHaveBeenCalledWith('/v1/competitor-product-recommendations/merge', {
      competitorProductId: 9,
      recommendationIds: [1, 2],
    })
  })

  it('sends the create-product body', async () => {
    const product = { name: 'X', brandId: 1, categoryOptionId: 2, uomGroupId: 3, comparisons: [] }
    await CompetitorProductRecommendationsService.createProduct(product, [4], [7])
    expect(post).toHaveBeenCalledWith('/v1/competitor-product-recommendations/create-product', {
      product,
      recommendationIds: [4],
      photoFileIds: [7],
    })
  })

  it('sends the reject reason only when given', async () => {
    await CompetitorProductRecommendationsService.reject(4, 'dup')
    expect(post).toHaveBeenLastCalledWith('/v1/competitor-product-recommendations/4/reject', {
      reason: 'dup',
    })
    await CompetitorProductRecommendationsService.reject(4)
    expect(post).toHaveBeenLastCalledWith('/v1/competitor-product-recommendations/4/reject', {})
  })
})
