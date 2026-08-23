import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SuppliersService } from './suppliers.service'
import ApiService from './api'

// The bug this guards against is silent: /v1/suppliers ignores parameters it
// does not recognise, so a wrong query still returns 200 with every supplier.
// Asserting on the URL is the only way to see the difference.
vi.mock('./api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [], meta: { total: 0, limit: 10, offset: 0 } })),
  },
}))

const get = vi.mocked(ApiService.get)

function requestedParams(): URLSearchParams {
  const url = get.mock.calls.at(-1)?.[0] as string
  return new URLSearchParams(url.split('?')[1] ?? '')
}

describe('SuppliersService.listForSelect', () => {
  beforeEach(() => get.mockClear())

  it('renames the term the picker types into the parameter the endpoint reads', async () => {
    await SuppliersService.listForSelect('search=maju&limit=10')

    const params = requestedParams()
    expect(params.get('q')).toBe('maju')
    expect(params.has('search')).toBe(false)
  })

  it('converts a page number into a row offset', async () => {
    await SuppliersService.listForSelect('page=3&limit=10')

    const params = requestedParams()
    expect(params.get('offset')).toBe('20')
    expect(params.has('page')).toBe(false)
  })

  it('translates the filters the endpoint knows by name', async () => {
    await SuppliersService.listForSelect(
      'filterBy=isActive&filterOperator=0&filterValue=true' +
        '&filterBy=paymentTermId&filterOperator=0&filterValue=4',
    )

    const params = requestedParams()
    expect(params.get('isActive')).toBe('true')
    expect(params.get('paymentTermId')).toBe('4')
  })

  // The Status column filters to a boolean. `false` is a value, not an absence,
  // and it used to be dropped on the way out -- so "Inactive" came back as the
  // unfiltered list.
  it('carries an isActive filter of false', async () => {
    await SuppliersService.listForSelect('filterBy=isActive&filterOperator=0&filterValue=false')

    expect(requestedParams().get('isActive')).toBe('false')
  })

  it('drops a filter the endpoint has no parameter for', async () => {
    // /v1/suppliers matches code only through `q`. Forwarding a `code` filter
    // would read as a filter that applied; it would not.
    await SuppliersService.listForSelect('filterBy=code&filterOperator=0&filterValue=SUP-01')

    expect(requestedParams().has('code')).toBe(false)
  })

  it('handles an empty query without inventing parameters', async () => {
    await SuppliersService.listForSelect()

    expect(get).toHaveBeenCalledWith('/v1/suppliers')
  })
})

// The supplier list view hands this to TableComponent as `query-adapter`.
describe('SuppliersService.toListQuery', () => {
  it('drops the sort the endpoint has no parameter for', () => {
    // /v1/suppliers orders by id DESC and reads no sort parameter, so no
    // supplier column is marked sortable.
    const params = new URLSearchParams(
      SuppliersService.toListQuery('sortBy=name&sortOperator=asc&page=1&limit=10'),
    )

    expect(params.has('sortBy')).toBe(false)
    expect(params.has('sortOperator')).toBe(false)
  })
})
