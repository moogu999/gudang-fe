import { describe, it, expect } from 'vitest'
import { CacheKeyStore, matchesPattern, overlaps, type CachePolicies } from './cacheKeys'

const policies: CachePolicies = {
  tiers: { master_ref: { maxAge: 86400 }, master_edit: { maxAge: 60 } },
  groups: [
    {
      key: 'countries',
      tier: 'master_ref',
      paths: ['/gen/v1/countries', '/gen/v1/countries/{id}'],
    },
    {
      key: 'products',
      tier: 'master_edit',
      paths: ['/gen/v1/products', '/gen/v1/products/{id}', '/v1/products'],
    },
    {
      key: 'price-lists',
      tier: 'master_edit',
      paths: ['/gen/v1/price-lists', '/v1/price-lists/{id}'],
    },
    { key: 'customers', tier: 'master_edit', paths: ['/v1/customers', '/v1/customers/{id}'] },
    {
      key: 'sales-order-configs',
      tier: 'master_edit',
      paths: ['/v1/sales-order-configs', '/v1/sales-order-configs/{branchId}'],
    },
  ],
  invalidations: [
    { method: 'POST', path: '/gen/v1/product-label-options', groups: ['products'] },
    { method: 'POST', path: '/v1/auth/sign-in', groups: ['*'] },
  ],
}

function store(start = 1000) {
  let t = start
  const s = new CacheKeyStore(() => t)
  s.setPolicies(policies)
  return { s, tick: (ms = 1) => (t += ms) }
}

describe('matchesPattern', () => {
  it('matches params against any one segment', () => {
    expect(matchesPattern('/v1/customers/{id}', '/v1/customers/42')).toBe(true)
  })

  it('ignores the query string', () => {
    expect(matchesPattern('/gen/v1/products', '/gen/v1/products?limit=10')).toBe(true)
  })

  it('requires the same number of segments', () => {
    expect(matchesPattern('/v1/customers', '/v1/customers/42')).toBe(false)
    expect(matchesPattern('/v1/customers/{id}', '/v1/customers')).toBe(false)
  })
})

describe('overlaps', () => {
  it('treats a sub-resource write as touching its parent', () => {
    expect(overlaps('/v1/products', '/v1/products/5/labels')).toBe(true)
  })

  it('treats a create on the collection as touching the by-id route', () => {
    expect(overlaps('/v1/price-lists/{id}', '/v1/price-lists')).toBe(true)
  })

  it('compares whole segments, not string prefixes', () => {
    expect(overlaps('/gen/v1/customers', '/gen/v1/customer-label-options')).toBe(false)
  })
})

describe('CacheKeyStore', () => {
  it('returns no version for transactional paths', () => {
    const { s } = store()
    expect(s.versionFor('/v1/invoices')).toBeUndefined()
  })

  it('returns no version before the policies load', () => {
    const s = new CacheKeyStore(() => 1000)
    expect(s.loaded).toBe(false)
    expect(s.versionFor('/gen/v1/countries')).toBeUndefined()
  })

  it('starts every group at the boot version', () => {
    const { s } = store(1000)
    expect(s.versionFor('/gen/v1/countries')).toBe(1000)
    expect(s.versionFor('/gen/v1/products/7')).toBe(1000)
  })

  it('bumps the group a write goes to, and only that group', () => {
    const { s, tick } = store(1000)
    tick()
    s.recordWrite('PATCH', '/gen/v1/products/7')

    const v = s.versionFor('/gen/v1/products')!
    expect(v).toBeGreaterThan(1000)
    // the custom route shares the group
    expect(s.versionFor('/v1/products?search=a')).toBe(v)
    expect(s.versionFor('/gen/v1/countries')).toBe(1000)
  })

  it('bumps via a sub-resource write', () => {
    const { s } = store(1000)
    s.recordWrite('PUT', '/v1/customers/3/labels')
    expect(s.versionFor('/v1/customers')).toBeGreaterThan(1000)
  })

  it('bumps the groups named by an invalidation', () => {
    const { s } = store(1000)
    s.recordWrite('post', '/gen/v1/product-label-options')
    expect(s.versionFor('/gen/v1/products')).toBeGreaterThan(1000)
  })

  it('bumps everything on a wildcard invalidation', () => {
    const { s } = store(1000)
    s.recordWrite('POST', '/v1/auth/sign-in')
    expect(s.versionFor('/gen/v1/countries')).toBeGreaterThan(1000)
    expect(s.versionFor('/v1/customers')).toBeGreaterThan(1000)
  })

  it('always produces a new version, even within the same millisecond', () => {
    const { s } = store(1000)
    s.recordWrite('PATCH', '/gen/v1/products/7')
    const first = s.versionFor('/gen/v1/products')!
    s.recordWrite('PATCH', '/gen/v1/products/7')
    expect(s.versionFor('/gen/v1/products')).toBeGreaterThan(first)
  })

  it('bumps the admin config when writing a branch config', () => {
    const { s } = store(1000)
    s.recordWrite('PUT', '/v1/sales-order-configs/4')
    expect(s.versionFor('/v1/sales-order-configs')).toBeGreaterThan(1000)
  })

  it('ignores writes that touch no master data', () => {
    const { s } = store(1000)
    s.recordWrite('POST', '/v1/sales-orders')
    expect(s.versionFor('/gen/v1/products')).toBe(1000)
  })

  it('bumps groups that embed the written group, directly or not', () => {
    const { s } = store(1000)
    s.setPolicies(embedPolicies)
    s.recordWrite('PATCH', '/gen/v1/uom-groups/3')
    expect(s.versionFor('/gen/v1/uom-groups')).toBeGreaterThan(1000)
    expect(s.versionFor('/gen/v1/products')).toBeGreaterThan(1000)
    expect(s.versionFor('/v1/price-lists/1')).toBeGreaterThan(1000)
    expect(s.versionFor('/v1/customers')).toBe(1000)
  })

  it('bumps groups that embed a written source', () => {
    const { s } = store(1000)
    s.setPolicies(embedPolicies)
    s.recordWrite('patch', '/v1/users/5')
    expect(s.versionFor('/v1/customers')).toBeGreaterThan(1000)
    expect(s.versionFor('/gen/v1/products')).toBe(1000)
  })

  it('ignores a source write with another method', () => {
    const { s } = store(1000)
    s.setPolicies(embedPolicies)
    s.recordWrite('POST', '/v1/users/5')
    expect(s.versionFor('/v1/customers')).toBe(1000)
  })
})

// price-lists embeds products, which embeds uom-groups; customers embed the
// users source.
const embedPolicies: CachePolicies = {
  ...policies,
  groups: [
    {
      key: 'uom-groups',
      tier: 'master_edit',
      paths: ['/gen/v1/uom-groups', '/gen/v1/uom-groups/{id}'],
      dependsOn: [],
    },
    { ...policies.groups[1]!, dependsOn: ['uom-groups'] },
    { ...policies.groups[2]!, dependsOn: ['products', 'uom-groups'] },
    { ...policies.groups[3]!, dependsOn: ['users'] },
  ],
  sources: [{ key: 'users', writes: [{ method: 'PATCH', path: '/v1/users/{id}' }] }],
}
