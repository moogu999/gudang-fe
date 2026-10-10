import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  SalesTeam,
  SalesTeamSummary,
  CreateSalesTeamRequest,
  UpdateSalesTeamRequest,
  UncoveredProduct,
  SalesTeamProductList,
  SalesTeamProductFilters,
  LabelBucketFilter,
  PickerSegment,
  PickerTreeNode,
  PickerCandidate,
  PickerCandidateQuery,
  AddSalesTeamProductsResult,
  RemoveSalesTeamProductsResult,
  SalesTeamMember,
  MemberCandidate,
  AddSalesTeamMemberRequest,
} from '@/types/salesTeam.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'

/** The filters `/v1/sales-teams` reads by name. */
const toListQuery = createListQueryAdapter([
  'branchId',
  'principalOptionId',
  'noPrincipal',
  'status',
])

/** `/member-candidates` reads only `q`, `limit` and `offset`. */
const toCandidateQuery = createListQueryAdapter([])

/** Writes the set fields of a principal/category bucket filter onto `params`. */
function appendLabelBuckets(params: URLSearchParams, filter: LabelBucketFilter) {
  if (filter.principalOptionId) params.set('principalOptionId', String(filter.principalOptionId))
  else if (filter.noPrincipal) params.set('noPrincipal', 'true')
  if (filter.categoryOptionId) params.set('categoryOptionId', String(filter.categoryOptionId))
  else if (filter.noCategory) params.set('noCategory', 'true')
}

function withQuery(url: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Sales teams: a branch's salesmen who carry the same SKU list under one
 * supervisor. Every route is scoped to the caller's branches; another branch's
 * team reads as 404.
 */
export class SalesTeamsService {
  private static readonly BASE_URL = API_ENDPOINTS.SALES_TEAMS

  /**
   * Translates a generic CRUD query string into the parameters `/v1/sales-teams`
   * reads. Pass it as `TableComponent`'s `query-adapter`.
   */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<Base<SalesTeam>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SalesTeam>>(url)
  }

  /** Header counts for one branch, or for all of the caller's branches when omitted. */
  static async summary(branchId?: number): Promise<SalesTeamSummary> {
    const params = new URLSearchParams()
    if (branchId) params.set('branchId', String(branchId))
    return ApiService.get<SalesTeamSummary>(withQuery(`${this.BASE_URL}/summary`, params))
  }

  /** Products no active team of the branch carries, newest first. */
  static async uncoveredProducts(
    branchId: number,
    options: { q?: string; limit?: number; offset?: number } = {},
  ): Promise<Base<UncoveredProduct>> {
    const params = new URLSearchParams({ branchId: String(branchId) })
    if (options.q) params.set('q', options.q)
    if (options.limit) params.set('limit', String(options.limit))
    if (options.offset) params.set('offset', String(options.offset))
    return ApiService.get<Base<UncoveredProduct>>(
      withQuery(`${this.BASE_URL}/uncovered-products`, params),
    )
  }

  static async get(id: number): Promise<SalesTeam> {
    return ApiService.get<SalesTeam>(`${this.BASE_URL}/${id}`)
  }

  /**
   * Create a team. With `copyFromTeamId`, the source team's SKU list is copied
   * server-side in the same transaction; its members are not.
   */
  static async create(body: CreateSalesTeamRequest): Promise<SalesTeam> {
    return ApiService.post<SalesTeam>(this.BASE_URL, body)
  }

  /** The code and branch can't change; duplicate the team to move it to another branch. */
  static async update(id: number, body: UpdateSalesTeamRequest): Promise<SalesTeam> {
    return ApiService.put<SalesTeam>(`${this.BASE_URL}/${id}`, body)
  }

  static async activate(id: number): Promise<SalesTeam> {
    return ApiService.post<SalesTeam>(`${this.BASE_URL}/${id}/activate`, {})
  }

  /** 409 while the team still has current members. */
  static async deactivate(id: number): Promise<SalesTeam> {
    return ApiService.post<SalesTeam>(`${this.BASE_URL}/${id}/deactivate`, {})
  }

  // ---------------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------------

  /** The team's whole SKU list (not paginated), ordered principal → category → code. */
  static async listProducts(
    id: number,
    filters: SalesTeamProductFilters = {},
  ): Promise<SalesTeamProductList> {
    const params = new URLSearchParams()
    appendLabelBuckets(params, filters)
    if (filters.q) params.set('q', filters.q)
    return ApiService.get<SalesTeamProductList>(
      withQuery(`${this.BASE_URL}/${id}/products`, params),
    )
  }

  /** Products the team already carries are skipped and counted in `skipped`. */
  static async addProducts(id: number, productIds: number[]): Promise<AddSalesTeamProductsResult> {
    return ApiService.post<AddSalesTeamProductsResult>(`${this.BASE_URL}/${id}/products`, {
      productIds,
    })
  }

  static async removeProducts(
    id: number,
    productIds: number[],
  ): Promise<RemoveSalesTeamProductsResult> {
    return ApiService.post<RemoveSalesTeamProductsResult>(
      `${this.BASE_URL}/${id}/products/remove`,
      { productIds },
    )
  }

  /** Principal → category counts of the products in a picker segment. */
  static async pickerTree(id: number, segment: PickerSegment): Promise<PickerTreeNode[]> {
    const params = new URLSearchParams({ segment })
    const res = await ApiService.get<{ data: PickerTreeNode[] }>(
      withQuery(`${this.BASE_URL}/${id}/product-picker/tree`, params),
    )
    return res.data
  }

  static async pickerCandidates(
    id: number,
    query: PickerCandidateQuery,
  ): Promise<Base<PickerCandidate>> {
    const params = new URLSearchParams({ segment: query.segment })
    appendLabelBuckets(params, query)
    if (query.q) params.set('q', query.q)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<PickerCandidate>>(
      withQuery(`${this.BASE_URL}/${id}/product-picker/candidates`, params),
    )
  }

  // ---------------------------------------------------------------------------
  // Members
  // ---------------------------------------------------------------------------

  /** Current members first; past ones too when `includeHistory`. */
  static async listMembers(id: number, includeHistory = false): Promise<SalesTeamMember[]> {
    const params = new URLSearchParams()
    if (includeHistory) params.set('includeHistory', 'true')
    const res = await ApiService.get<{ data: SalesTeamMember[] }>(
      withQuery(`${this.BASE_URL}/${id}/members`, params),
    )
    return res.data
  }

  /**
   * Active Salesman and Canvass employees of the team's branch who aren't
   * current members of it, each with the team they are in now.
   *
   * @param queryString - The endpoint's own `q`/`limit`/`offset`
   */
  static async memberCandidates(id: number, queryString?: string): Promise<Base<MemberCandidate>> {
    const url = `${this.BASE_URL}/${id}/member-candidates`
    return ApiService.get<Base<MemberCandidate>>(queryString ? `${url}?${queryString}` : url)
  }

  /** {@link memberCandidates} for an `InfiniteSelect`, translating its generic query string. */
  static async memberCandidatesForSelect(
    id: number,
    queryString?: string,
  ): Promise<Base<MemberCandidate>> {
    return this.memberCandidates(id, toCandidateQuery(queryString))
  }

  /** With `move`, the employee's current membership ends the day before `startDate`. */
  static async addMember(id: number, body: AddSalesTeamMemberRequest): Promise<SalesTeamMember> {
    return ApiService.post<SalesTeamMember>(`${this.BASE_URL}/${id}/members`, body)
  }

  /** @param endDate - `YYYY-MM-DD`, inclusive, between the start date and today */
  static async endMember(
    id: number,
    membershipId: number,
    endDate: string,
  ): Promise<SalesTeamMember> {
    return ApiService.post<SalesTeamMember>(`${this.BASE_URL}/${id}/members/${membershipId}/end`, {
      endDate,
    })
  }
}
