export class GenericQueryBuilder {
  private queryParams: URLSearchParams

  constructor() {
    this.queryParams = new URLSearchParams()
  }

  withFilter(filterBy: string, filterOperator: string, filterValue: string | number): this {
    this.queryParams.append(`filterBy`, filterBy)
    this.queryParams.append(`filterOperator`, filterOperator)
    this.queryParams.append(`filterValue`, String(filterValue))
    return this
  }

  withSort(sortBy: string, sortOperator: 'asc' | 'desc'): this {
    this.queryParams.append('sortBy', sortBy)
    this.queryParams.append('sortOperator', sortOperator)
    return this
  }

  withSearch(search: string): this {
    this.queryParams.append('search', search)
    return this
  }

  withPagination(page: number, limit: number): this {
    this.queryParams.append('page', String(page))
    this.queryParams.append('limit', String(limit))
    return this
  }

  build(): string {
    return this.queryParams.toString()
  }

  mapSortOperator(value: number): 'asc' | 'desc' {
    return value === 1 ? 'asc' : 'desc'
  }
}
