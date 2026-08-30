import FilterOperator from '@/constants/filterOperator'

/**
 * Builds an adapter that rewrites a generic CRUD query string into the
 * parameters a hand-written `/v1/...` list endpoint reads.
 *
 * `TableComponent` and `InfiniteSelect` both speak the generic dialect that
 * {@link GenericQueryBuilder} produces — `search`, `page`, and
 * `filterBy`/`filterOperator`/`filterValue` triples. The hand-written endpoints
 * read `q`, `offset` and named filters instead, and they ignore parameters they
 * do not recognise rather than rejecting them. So an unadapted query returns 200
 * with every row in it: the request looks like it worked, and the search or the
 * page change silently did nothing.
 *
 * @param filterParams - The named filters the endpoint reads. Anything outside
 *   this set is dropped, because forwarding it would only look like a filter
 *   that applied.
 * @returns A function that rewrites a generic query string into the endpoint's
 *   own parameters, ready to hand to a service's `list()` or to
 *   `TableComponent`'s `query-adapter`.
 *
 * @example
 * ```typescript
 * const toListQuery = createListQueryAdapter(['isActive', 'paymentTermId'])
 * toListQuery('search=budi&page=2&limit=10') // 'limit=10&offset=10&q=budi'
 * ```
 */
export function createListQueryAdapter(
  filterParams: readonly string[],
): (queryString?: string) => string {
  const allowed = new Set(filterParams)

  return function toListQuery(queryString?: string): string {
    const from = new URLSearchParams(queryString ?? '')
    const to = new URLSearchParams()

    const limit = from.get('limit')
    if (limit) to.set('limit', limit)

    // The endpoints count in rows, not pages.
    const page = Number(from.get('page'))
    if (page > 1 && limit) to.set('offset', String((page - 1) * Number(limit)))

    const search = from.get('search')
    if (search) to.set('q', search)

    // The three filter parts arrive as parallel lists, one entry per filter.
    const filterBys = from.getAll('filterBy')
    const filterOperators = from.getAll('filterOperator')
    const filterValues = from.getAll('filterValue')

    filterBys.forEach((by, i) => {
      // Named filters are equality only; the endpoints have no operator of their own.
      if (filterOperators[i] !== FilterOperator.EQUAL) return
      if (!allowed.has(by)) return
      to.set(by, filterValues[i])
    })

    // `sortBy`/`sortOperator` are dropped: these endpoints order by id DESC and
    // read no sort parameter. Columns pointed at them must not be `sortable`.

    return to.toString()
  }
}
