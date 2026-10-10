import { describe, it, expect } from 'vitest'
import { groupKeys, groupProducts, principalSummaryText } from './salesTeamGrouping'
import type { SalesTeamProduct } from '@/types/salesTeam.type'

const names = { noPrincipal: '(No principal)', noCategory: '(No category)' }

function product(
  code: string,
  principal?: [number, string],
  category?: [number, string],
): SalesTeamProduct {
  return {
    productId: Number(code.replace(/\D/g, '')),
    code,
    name: `Product ${code}`,
    addedAt: '2026-10-01T00:00:00Z',
    ...(principal && { principal: { optionId: principal[0], value: principal[1] } }),
    ...(category && { category: { optionId: category[0], value: category[1] } }),
  }
}

describe('groupProducts', () => {
  it('orders principal → category → code, with unlabelled buckets last', () => {
    const rows = groupProducts(
      [
        product('P5'),
        product('P4', [2, 'Indofood'], undefined),
        product('P3', [2, 'Indofood'], [8, 'Noodle']),
        product('P1', [1, 'Bogasari'], [9, 'Flour']),
        product('P2', [2, 'Indofood'], [7, 'Bumbu']),
        product('P0', [2, 'Indofood'], [7, 'Bumbu']),
      ],
      names,
    )
    expect(rows.map((r) => r.code)).toEqual(['P1', 'P0', 'P2', 'P3', 'P4', 'P5'])
  })

  it('labels missing principal and category and counts each bucket', () => {
    const rows = groupProducts(
      [
        product('P1', [2, 'Indofood'], [7, 'Bumbu']),
        product('P2', [2, 'Indofood'], [7, 'Bumbu']),
        product('P3'),
      ],
      names,
    )
    expect(rows[0]).toMatchObject({
      principalName: 'Indofood',
      categoryName: 'Bumbu',
      groupCount: 2,
    })
    expect(rows[2]).toMatchObject({
      principalName: '(No principal)',
      categoryName: '(No category)',
      groupCount: 1,
    })
    expect(groupKeys(rows)).toEqual(['2:7', 'none:none'])
  })

  it('keeps a bucket contiguous even when the input interleaves it', () => {
    const rows = groupProducts(
      [
        product('P1', [1, 'A'], [1, 'X']),
        product('P2', [1, 'A'], [2, 'Y']),
        product('P3', [1, 'A'], [1, 'X']),
      ],
      names,
    )
    expect(rows.map((r) => r.groupKey)).toEqual(['1:1', '1:1', '1:2'])
  })
})

describe('principalSummaryText', () => {
  it('spells out up to the limit, naming the unlabelled bucket', () => {
    const principals = [
      { optionId: 1, name: 'Indofood', skuCount: 128 },
      { optionId: 2, name: 'Bogasari', skuCount: 14 },
      { skuCount: 3 },
    ]
    expect(principalSummaryText(principals, '(No principal)', 2)).toBe('Indofood 128 · Bogasari 14')
    expect(principalSummaryText(principals, '(No principal)')).toBe(
      'Indofood 128 · Bogasari 14 · (No principal) 3',
    )
  })
})
