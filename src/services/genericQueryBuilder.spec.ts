import { describe, it, expect } from 'vitest'
import { GenericQueryBuilder } from './genericQueryBuilder'
import FilterOperator from '@/constants/filterOperator'

describe('GenericQueryBuilder.withFilter', () => {
  function params(value: string | number | boolean): URLSearchParams {
    return new URLSearchParams(
      new GenericQueryBuilder().withFilter('isActive', FilterOperator.EQUAL, value).build(),
    )
  }

  // A boolean column filters to true or false. Both are values the table has to
  // be able to ask for; only one of them is truthy.
  it('serialises a false filter value', () => {
    expect(params(false).get('filterValue')).toBe('false')
  })

  it('serialises a true filter value', () => {
    expect(params(true).get('filterValue')).toBe('true')
  })

  it('serialises a zero filter value', () => {
    expect(params(0).get('filterValue')).toBe('0')
  })

  it('keeps the three filter parts aligned', () => {
    const built = params(false)

    expect(built.get('filterBy')).toBe('isActive')
    expect(built.get('filterOperator')).toBe(FilterOperator.EQUAL)
  })
})
