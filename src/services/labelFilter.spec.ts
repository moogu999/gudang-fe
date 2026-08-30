import { describe, it, expect } from 'vitest'
import { labelFilterParam } from './labelFilter'
import { CustomersService } from './customers.service'
import { ProductsService } from './products.service'

describe('labelFilterParam', () => {
  it('spells a pair as one percent-encoded value', () => {
    expect(labelFilterParam(3, 7)).toBe('labelFilter=3%3A7')
  })

  it('repeats the parameter for more than one filter', () => {
    expect([labelFilterParam(3, 7), labelFilterParam(4, 9)].join('&')).toBe(
      'labelFilter=3%3A7&labelFilter=4%3A9',
    )
  })

  // Both endpoints parse the pair with the same Go helper, so the two services
  // must not be able to drift apart on how they spell it.
  it('is the one implementation both services expose', () => {
    expect(CustomersService.labelFilterParam).toBe(labelFilterParam)
    expect(ProductsService.labelFilterParam).toBe(labelFilterParam)
  })
})
