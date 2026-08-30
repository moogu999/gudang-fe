import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmployeesService } from './employees.service'
import ApiService from './api'

// The bug this guards against is silent: /v1/employees ignores parameters it
// does not recognise, so a wrong query still returns 200 with every employee.
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

describe('EmployeesService.listForSelect', () => {
  beforeEach(() => get.mockClear())

  it('translates an equality filter into the named parameter', async () => {
    await EmployeesService.listForSelect('filterBy=employeeTypeId&filterOperator=0&filterValue=1')

    const params = requestedParams()
    expect(params.get('employeeTypeId')).toBe('1')
    expect(params.has('filterBy')).toBe(false)
  })

  it('translates every filter when a select sends more than one', async () => {
    await EmployeesService.listForSelect(
      'filterBy=employeeTypeId&filterOperator=0&filterValue=1' +
        '&filterBy=branchId&filterOperator=0&filterValue=7',
    )

    const params = requestedParams()
    expect(params.get('employeeTypeId')).toBe('1')
    expect(params.get('branchId')).toBe('7')
  })

  it('drops a filter the endpoint has no parameter for', async () => {
    // Forwarding it would read as a filter that applied. It would not.
    await EmployeesService.listForSelect('filterBy=nickname&filterOperator=0&filterValue=Budi')

    expect(requestedParams().has('nickname')).toBe(false)
  })

  it('drops a range filter, which the named parameters cannot express', async () => {
    await EmployeesService.listForSelect('filterBy=branchId&filterOperator=1&filterValue=1,5')

    expect(requestedParams().has('branchId')).toBe(false)
  })

  it('renames the search term to the parameter the endpoint reads', async () => {
    await EmployeesService.listForSelect('search=budi&limit=10')

    const params = requestedParams()
    expect(params.get('q')).toBe('budi')
    expect(params.has('search')).toBe(false)
  })

  it('converts a page number into a row offset', async () => {
    await EmployeesService.listForSelect('page=3&limit=10')

    const params = requestedParams()
    expect(params.get('offset')).toBe('20')
    expect(params.get('limit')).toBe('10')
    expect(params.has('page')).toBe(false)
  })

  it('sends no offset for the first page', async () => {
    await EmployeesService.listForSelect('page=1&limit=10')

    expect(requestedParams().has('offset')).toBe(false)
  })

  it('handles an empty query without inventing parameters', async () => {
    await EmployeesService.listForSelect()

    expect(get).toHaveBeenCalledWith('/v1/employees')
  })

  // The adapter builds its output from scratch, so a named filter a caller has
  // already spelled the endpoint's way is dropped, not passed through. Callers
  // that scope a picker -- EmployeeDetailView's supervisor field -- have to
  // translate first and append their own filters after.
  it('drops a named filter that did not arrive as a generic triple', async () => {
    await EmployeesService.listForSelect('search=budi&limit=10&salesOrganizationId=5')

    const params = requestedParams()
    expect(params.get('q')).toBe('budi')
    expect(params.has('salesOrganizationId')).toBe(false)
  })
})

// The employee list view hands this to TableComponent as `query-adapter`. The
// table fetches by URL itself, so without the adapter its search box builds
// `search=` -- a parameter this endpoint drops, leaving the table showing every
// employee as though nothing had been typed.
describe('EmployeesService.toListQuery', () => {
  function adapted(queryString: string): URLSearchParams {
    return new URLSearchParams(EmployeesService.toListQuery(queryString))
  }

  it('renames the term the search box builds', () => {
    const params = adapted('search=budi&page=1&limit=10')

    expect(params.get('q')).toBe('budi')
    expect(params.has('search')).toBe(false)
  })

  it('converts the page the paginator builds into a row offset', () => {
    const params = adapted('search=budi&page=2&limit=10')

    expect(params.get('offset')).toBe('10')
    expect(params.get('q')).toBe('budi')
    expect(params.has('page')).toBe(false)
  })

  it('drops the sort the endpoint has no parameter for', () => {
    // /v1/employees orders by id DESC and reads no sort parameter. Forwarding
    // one would read as a sort that applied.
    const params = adapted('sortBy=name&sortOperator=asc&page=1&limit=10')

    expect(params.has('sortBy')).toBe(false)
    expect(params.has('sortOperator')).toBe(false)
  })
})
