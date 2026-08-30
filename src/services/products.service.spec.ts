import { describe, it, expect } from 'vitest'
import { ProductsService } from './products.service'

// The filter used to be spelled as a nested deepObject array, which the backend
// binder cannot populate: it keeps each element's scalar value and drops its
// fields, so every pair arrived as 0:0 and the products list came back empty.
describe('ProductsService.labelFilterParam', () => {
  it('spells a pair the way the endpoint reads it', () => {
    expect(ProductsService.labelFilterParam(4, 4)).toBe('labelFilter=4%3A4')
  })

  it('survives a round trip through URLSearchParams', () => {
    const params = new URLSearchParams(
      [ProductsService.labelFilterParam(4, 4), ProductsService.labelFilterParam(5, 1)].join('&'),
    )

    expect(params.getAll('labelFilter')).toEqual(['4:4', '5:1'])
  })

  it('has no query adapter, because /v1/products already reads search and page', () => {
    // Unlike the customers list. Adding one would rename the very parameters
    // this endpoint wants.
    expect('toListQuery' in ProductsService).toBe(false)
  })
})
