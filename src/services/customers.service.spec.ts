import { describe, it, expect } from 'vitest'
import { CustomersService } from './customers.service'

// GET /v1/customers used to be declared by two backend modules at once, and the
// nested spelling the label filter was written in could not bind anyway, so the
// filter silently returned every customer. These pin the wire format that works.
describe('CustomersService.labelFilterParam', () => {
  it('spells a pair the way the endpoint reads it', () => {
    expect(CustomersService.labelFilterParam(3, 7)).toBe('labelFilter=3%3A7')
  })

  it('survives a round trip through URLSearchParams', () => {
    const params = new URLSearchParams(
      [CustomersService.labelFilterParam(3, 7), CustomersService.labelFilterParam(4, 9)].join('&'),
    )

    expect(params.getAll('labelFilter')).toEqual(['3:7', '4:9'])
  })
})

describe('CustomersService.toListQuery', () => {
  function adapted(queryString: string): URLSearchParams {
    return new URLSearchParams(CustomersService.toListQuery(queryString))
  }

  it('renames the term the search box builds', () => {
    const params = adapted('search=budi&page=1&limit=10')

    expect(params.get('q')).toBe('budi')
    expect(params.has('search')).toBe(false)
  })

  it('converts a page number into a row offset', () => {
    expect(adapted('page=3&limit=10').get('offset')).toBe('20')
  })

  it('translates the filters the endpoint knows by name', () => {
    const params = adapted('filterBy=isActive&filterOperator=0&filterValue=true')

    expect(params.get('isActive')).toBe('true')
  })

  it('drops a filter the endpoint has no parameter for', () => {
    // /v1/customers matches code only through `q`.
    expect(adapted('filterBy=code&filterOperator=0&filterValue=C-1').has('code')).toBe(false)
  })

  it('drops the sort the endpoint has no parameter for', () => {
    // It orders by created_at DESC and reads no sort parameter, which is why the
    // list view withdraws its sort controls while a label filter is on.
    const params = adapted('sortBy=name&sortOperator=asc&page=1&limit=10')

    expect(params.has('sortBy')).toBe(false)
  })
})
