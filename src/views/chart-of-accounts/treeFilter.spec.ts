import { describe, it, expect } from 'vitest'
import {
  toTreeNodes,
  filterTree,
  expandedKeysFor,
  allExpandedKeys,
  flattenTree,
  normalizeTree,
} from './treeFilter'
import type { ChartOfAccountNode } from '@/types/chartOfAccount.type'

function account(overrides: Partial<ChartOfAccountNode>): ChartOfAccountNode {
  return {
    id: 1,
    companyId: 1,
    parentId: null,
    code: '1-1000',
    name: 'AKTIVA LANCAR',
    accountTypeId: 1,
    normalBalance: 'DEBIT',
    isHeader: true,
    controlAccountTypeId: null,
    isRetainedEarnings: false,
    depth: 1,
    isActive: true,
    inUse: false,
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: 1,
    updatedAt: null,
    updatedBy: null,
    children: [],
    ...overrides,
  }
}

describe('normalizeTree', () => {
  it('replaces a null/undefined children field (a leaf from the API) with an empty array', () => {
    const apiLeaf = account({ id: 1 })
    // The API serializes a nil Go slice as null, not [] — simulate that raw shape.
    ;(apiLeaf as unknown as { children: null }).children = null

    const result = normalizeTree([apiLeaf])

    expect(result[0].children).toEqual([])
  })

  it('normalizes nested children recursively', () => {
    const child = account({ id: 2, parentId: 1 })
    ;(child as unknown as { children: null }).children = null
    const root = account({ id: 1, children: [child] })

    const result = normalizeTree([root])

    expect(result[0].children[0].children).toEqual([])
  })

  it('returns an empty array for a null/undefined tree', () => {
    expect(normalizeTree(null)).toEqual([])
    expect(normalizeTree(undefined)).toEqual([])
  })
})

describe('toTreeNodes', () => {
  it('maps nested accounts onto PrimeVue TreeNode shape, preserving order', () => {
    const tree = [
      account({
        id: 1,
        code: '1-1000',
        children: [account({ id: 2, code: '1-1100', parentId: 1 })],
      }),
      account({ id: 3, code: '2-1000' }),
    ]

    const nodes = toTreeNodes(tree)

    expect(nodes).toHaveLength(2)
    expect(nodes[0].key).toBe('1')
    expect(nodes[0].data.code).toBe('1-1000')
    expect(nodes[0].children).toHaveLength(1)
    expect(nodes[0].children[0].key).toBe('2')
    expect(nodes[0].children[0].data.code).toBe('1-1100')
    expect(nodes[1].key).toBe('3')
  })
})

describe('filterTree', () => {
  const tree = [
    account({
      id: 1,
      code: '1-1000',
      name: 'AKTIVA LANCAR',
      children: [
        account({
          id: 2,
          code: '1-1100',
          name: 'Kas & Bank',
          parentId: 1,
          children: [
            account({ id: 3, code: '1-1101', name: 'Kas Kecil', parentId: 2, isHeader: false }),
          ],
        }),
      ],
    }),
    account({ id: 4, code: '2-1000', name: 'HUTANG USAHA', isHeader: true }),
  ]

  it('keeps a deep match plus its ancestors', () => {
    const result = filterTree(tree, (n) => n.code === '1-1101')

    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('1-1000')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].code).toBe('1-1100')
    expect(result[0].children[0].children).toHaveLength(1)
    expect(result[0].children[0].children[0].code).toBe('1-1101')
  })

  it('drops a non-matching sibling subtree', () => {
    const result = filterTree(tree, (n) => n.code === '1-1101')

    expect(result.some((n) => n.code === '2-1000')).toBe(false)
  })

  it('returns an empty array, not undefined, when nothing matches', () => {
    const result = filterTree(tree, (n) => n.code === 'NOPE')

    expect(result).toEqual([])
  })

  it('ANDs the search predicate with the type-chip predicate', () => {
    const searchMatch = (n: ChartOfAccountNode) => n.name.toLowerCase().includes('kas')
    const typeMatch = (n: ChartOfAccountNode) => n.isHeader === false

    const result = filterTree(tree, (n) => searchMatch(n) && typeMatch(n))

    // Only '1-1101' (Kas Kecil, detail) matches both; 'Kas & Bank' is a header so it's excluded
    // from the predicate itself but survives as an ancestor of the match.
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].children).toHaveLength(1)
    expect(result[0].children[0].children[0].code).toBe('1-1101')
  })
})

describe('expandedKeysFor', () => {
  it('expands every ancestor of a match in the filtered tree', () => {
    const filtered = filterTree(
      [
        account({
          id: 1,
          code: '1-1000',
          children: [
            account({
              id: 2,
              code: '1-1100',
              parentId: 1,
              children: [account({ id: 3, code: '1-1101', parentId: 2 })],
            }),
          ],
        }),
      ],
      (n) => n.code === '1-1101',
    )

    const expanded = expandedKeysFor(filtered)

    expect(expanded).toEqual({ '1': true, '2': true })
  })

  it('returns an empty map when there are no matches', () => {
    const expanded = expandedKeysFor([])

    expect(expanded).toEqual({})
  })
})

describe('allExpandedKeys', () => {
  it('marks every node that has children, regardless of matching', () => {
    const tree = [
      account({
        id: 1,
        children: [account({ id: 2, parentId: 1, children: [account({ id: 3, parentId: 2 })] })],
      }),
      account({ id: 4 }),
    ]

    expect(allExpandedKeys(tree)).toEqual({ '1': true, '2': true })
  })
})

describe('flattenTree', () => {
  it('flattens a nested tree depth-first', () => {
    const tree = [
      account({
        id: 1,
        children: [account({ id: 2, parentId: 1, children: [account({ id: 3, parentId: 2 })] })],
      }),
      account({ id: 4 }),
    ]

    expect(flattenTree(tree).map((n) => n.id)).toEqual([1, 2, 3, 4])
  })
})
