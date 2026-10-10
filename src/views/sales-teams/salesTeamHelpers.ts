import dayjs from 'dayjs'
import DateFormat from '@/constants/dateFormat'
import FilterOperator from '@/constants/filterOperator'
import {
  BranchesService,
  EmployeeTypesService,
  ProductLabelDefinitionsService,
  ProductLabelOptionsService,
} from '@/services'
import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
import { EMPLOYEE_TYPE_NAMES } from '@/constants/employeeTypes'
import type { Base } from '@/types/api.type'
import type { Branch } from '@/types/branch.type'
import type { ProductLabelSystemKey } from '@/types/productLabelDefinition.type'
import type { LabelBucketFilter } from '@/types/salesTeam.type'

/** A calendar date the way the sales team API reads it, never shifted by the browser's timezone. */
export function toApiDate(date: Date): string {
  return dayjs(date).format(DateFormat.DATE)
}

/** Parses an API `YYYY-MM-DD` date as a local calendar day. */
export function fromApiDate(date: string): Date {
  return dayjs(date).toDate()
}

/** Membership dates can't be in the future. */
export function today(): Date {
  return dayjs().startOf('day').toDate()
}

/**
 * Loads the branches the user is assigned to, for an `InfiniteSelect`.
 *
 * The sales team API only serves the caller's branches, so offering any other
 * one would only end in a 400.
 *
 * @param branchIds - The auth store's `branchIds`
 * @returns A `fetch-fn` that filters the loaded branches by the typed term
 */
export function userBranchesFetcher(branchIds: number[]) {
  let loaded: Promise<Branch[]> | null = null

  function load(): Promise<Branch[]> {
    if (!loaded) {
      loaded = Promise.all(
        branchIds.map(async (id) => {
          const query = new GenericQueryBuilder().withFilter('id', FilterOperator.EQUAL, id).build()
          const result = await BranchesService.list(query)
          return result.data[0]
        }),
      ).then((branches) => branches.filter((b): b is Branch => !!b))
    }
    return loaded
  }

  return async (query: string): Promise<Base<Branch>> => {
    const branches = await load()
    const search = new URLSearchParams(query).get('search')?.toLowerCase()
    const filtered = search
      ? branches.filter(
          (b) => b.name.toLowerCase().includes(search) || b.code.toLowerCase().includes(search),
        )
      : branches
    return {
      data: filtered,
      meta: { total: filtered.length, limit: filtered.length, offset: 0, hasMore: false },
    }
  }
}

/** The id of the "Sales Supervisor" employee type, looked up by name. */
export async function findSalesSupervisorTypeId(): Promise<number | undefined> {
  const res = await EmployeeTypesService.list('limit=100')
  return res.data.find((et) => et.name === EMPLOYEE_TYPE_NAMES.SALES_SUPERVISOR)?.id
}

/** `InfiniteSelect` filters for the eligible supervisors of a branch. */
export function supervisorFilters(typeId: number | undefined, branchId: number | undefined) {
  if (!typeId || !branchId) return []
  return [
    { filterBy: 'employeeTypeId', filterOperator: FilterOperator.EQUAL, filterValue: typeId },
    { filterBy: 'branchId', filterOperator: FilterOperator.EQUAL, filterValue: branchId },
    { filterBy: 'isActive', filterOperator: FilterOperator.EQUAL, filterValue: 'true' },
    { filterBy: 'isDraft', filterOperator: FilterOperator.EQUAL, filterValue: 'false' },
  ]
}

/** Select value standing for "no principal" / "no category". */
export const NO_LABEL = 'none'
export type LabelSelectValue = number | typeof NO_LABEL

/**
 * Options for a principal or category filter: every option of the system label,
 * then one for the products without it.
 *
 * @returns An empty list when the system label doesn't exist yet
 */
export async function loadLabelFilterOptions(
  systemKey: ProductLabelSystemKey,
  noneLabel: string,
): Promise<{ label: string; value: LabelSelectValue }[]> {
  const definition = await ProductLabelDefinitionsService.findSystem(systemKey)
  if (!definition) return []
  const query = new GenericQueryBuilder()
    .withFilter('product_label_definition_id', FilterOperator.EQUAL, definition.id)
    .withSort('value', 'asc')
    .withPagination(1, 500)
    .build()
  const res = await ProductLabelOptionsService.list(query)
  return [
    ...res.data.map((o) => ({ label: o.value, value: o.id as LabelSelectValue })),
    { label: noneLabel, value: NO_LABEL },
  ]
}

/** Turns principal/category filter selections into the API's bucket parameters. */
export function toLabelBuckets(
  principal: LabelSelectValue | undefined | null,
  category: LabelSelectValue | undefined | null,
): LabelBucketFilter {
  const filter: LabelBucketFilter = {}
  if (principal === NO_LABEL) filter.noPrincipal = true
  else if (principal) filter.principalOptionId = principal
  if (category === NO_LABEL) filter.noCategory = true
  else if (category) filter.categoryOptionId = category
  return filter
}
