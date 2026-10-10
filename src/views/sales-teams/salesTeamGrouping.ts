import type { SalesTeamProduct, SalesTeamPrincipalSummary } from '@/types/salesTeam.type'

/** Shown in place of a missing principal or category. */
export interface NoLabelNames {
  noPrincipal: string
  noCategory: string
}

export interface GroupedSalesTeamProduct extends SalesTeamProduct {
  /** Same for every product of one principal → category bucket. */
  groupKey: string
  principalName: string
  categoryName: string
  /** Products in this row's bucket. */
  groupCount: number
}

const NONE = 'none'

function groupKeyOf(product: SalesTeamProduct): string {
  return `${product.principal?.optionId ?? NONE}:${product.category?.optionId ?? NONE}`
}

/** Orders by name, with the missing value (`undefined`) last. */
function compareNamesNullsLast(a: string | undefined, b: string | undefined): number {
  if (a === b) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return a.localeCompare(b)
}

/**
 * Groups a team's products principal → category for a subheader-grouped table.
 *
 * The API already orders them this way, but the table needs every bucket's rows
 * to be contiguous, so the order is enforced here rather than trusted. Products
 * without a principal (and, within a principal, without a category) come last.
 */
export function groupProducts(
  products: SalesTeamProduct[],
  names: NoLabelNames,
): GroupedSalesTeamProduct[] {
  const sorted = [...products].sort(
    (a, b) =>
      compareNamesNullsLast(a.principal?.value, b.principal?.value) ||
      compareNamesNullsLast(a.category?.value, b.category?.value) ||
      a.code.localeCompare(b.code),
  )

  const counts = new Map<string, number>()
  for (const product of sorted) {
    const key = groupKeyOf(product)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return sorted.map((product) => {
    const groupKey = groupKeyOf(product)
    return {
      ...product,
      groupKey,
      principalName: product.principal?.value ?? names.noPrincipal,
      categoryName: product.category?.value ?? names.noCategory,
      groupCount: counts.get(groupKey) ?? 0,
    }
  })
}

/** The distinct group keys in display order. */
export function groupKeys(rows: GroupedSalesTeamProduct[]): string[] {
  return [...new Set(rows.map((r) => r.groupKey))]
}

/**
 * Formats a team's principal mix as "Indofood 128 · Bogasari 14".
 *
 * @param limit - How many principals to spell out; the rest are left to the caller
 */
export function principalSummaryText(
  principals: SalesTeamPrincipalSummary[],
  noPrincipal: string,
  limit = principals.length,
): string {
  return principals
    .slice(0, limit)
    .map((p) => `${p.name ?? noPrincipal} ${p.skuCount}`)
    .join(' · ')
}
