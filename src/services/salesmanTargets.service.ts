import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type { Base } from '@/types/api.type'
import type {
  AchievementItemBreakdownRow,
  AchievementSummary,
  CreateSalesmanTargetRequest,
  SalesmanTargetAchievement,
  SalesmanTarget,
  SalesmanTargetCandidateList,
  SalesmanTargetCandidateQuery,
  SalesmanTargetItemOption,
  SalesmanTargetItemOptionQuery,
  SalesmanTargetListRow,
  UpdateSalesmanTargetRequest,
} from '@/types/salesmanTarget.type'

/** The filters `/v1/salesman-targets` reads by name. */
const toListQuery = createListQueryAdapter([
  'period',
  'branchId',
  'source',
  'principalOptionId',
  'status',
])

function withQuery(url: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Salesman targets: a monthly allocation of targets to the salesmen of one branch.
 * Every route is scoped to the caller's branches; another branch's document reads as 404.
 */
export class SalesmanTargetsService {
  /**
   * Translates a generic CRUD query string into the parameters `/v1/salesman-targets`
   * reads. Pass it as `TableComponent`'s `query-adapter`.
   */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<Base<SalesmanTargetListRow>> {
    const url = API_ENDPOINTS.SALESMAN_TARGETS
    return ApiService.get<Base<SalesmanTargetListRow>>(queryString ? `${url}?${queryString}` : url)
  }

  static async get(id: number): Promise<SalesmanTarget> {
    return ApiService.get<SalesmanTarget>(API_ENDPOINTS.SALESMAN_TARGET_BY_ID(id))
  }

  static async create(body: CreateSalesmanTargetRequest): Promise<SalesmanTarget> {
    return ApiService.post<SalesmanTarget>(API_ENDPOINTS.SALESMAN_TARGETS, body)
  }

  /** The code, branch, period, source and principal can't change. 409 `TARGET_STALE` on an old version. */
  static async update(id: number, body: UpdateSalesmanTargetRequest): Promise<SalesmanTarget> {
    return ApiService.put<SalesmanTarget>(API_ENDPOINTS.SALESMAN_TARGET_BY_ID(id), body)
  }

  /** Only a draft can be deleted. */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.SALESMAN_TARGET_BY_ID(id))
  }

  static async activate(id: number, version: number): Promise<SalesmanTarget> {
    return ApiService.post<SalesmanTarget>(API_ENDPOINTS.SALESMAN_TARGET_ACTIVATE(id), { version })
  }

  /** Only once the period has ended. */
  static async close(id: number, version: number): Promise<SalesmanTarget> {
    return ApiService.post<SalesmanTarget>(API_ENDPOINTS.SALESMAN_TARGET_CLOSE(id), { version })
  }

  /** Eligible salesmen, plus the id of the document that already exists for the same key. */
  static async candidates(
    query: SalesmanTargetCandidateQuery,
  ): Promise<SalesmanTargetCandidateList> {
    const params = new URLSearchParams({
      branchId: String(query.branchId),
      period: query.period,
      source: query.source,
    })
    if (query.principalOptionId) params.set('principalOptionId', String(query.principalOptionId))
    if (query.excludeTargetId) params.set('excludeTargetId', String(query.excludeTargetId))
    return ApiService.get<SalesmanTargetCandidateList>(
      withQuery(API_ENDPOINTS.SALESMAN_TARGET_CANDIDATES, params),
    )
  }

  static async itemOptions(
    query: SalesmanTargetItemOptionQuery,
  ): Promise<Base<SalesmanTargetItemOption>> {
    const params = new URLSearchParams({
      branchId: String(query.branchId),
      level: query.level,
    })
    if (query.principalOptionId) params.set('principalOptionId', String(query.principalOptionId))
    if (query.q) params.set('q', query.q)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<SalesmanTargetItemOption>>(
      withQuery(API_ENDPOINTS.SALESMAN_TARGET_ITEM_OPTIONS, params),
    )
  }

  /** Computed live from applied invoices; 409 `TARGET_NOT_ACTIVE` for a draft. */
  static async achievement(id: number): Promise<SalesmanTargetAchievement> {
    return ApiService.get<SalesmanTargetAchievement>(API_ENDPOINTS.SALESMAN_TARGET_ACHIEVEMENT(id))
  }

  /** The products behind a category item's achievement; `employeeId` narrows it to one salesman. */
  static async achievementItem(
    id: number,
    itemId: number,
    employeeId?: number,
  ): Promise<AchievementItemBreakdownRow[]> {
    const params = new URLSearchParams()
    if (employeeId) params.set('employeeId', String(employeeId))
    const res = await ApiService.get<{ data: AchievementItemBreakdownRow[] }>(
      withQuery(API_ENDPOINTS.SALESMAN_TARGET_ACHIEVEMENT_ITEM(id, itemId), params),
    )
    return res.data ?? []
  }

  /** Achieved value of several documents at once, for the list column. */
  static async achievementSummaries(ids: number[]): Promise<AchievementSummary[]> {
    const params = new URLSearchParams({ ids: ids.join(',') })
    const res = await ApiService.get<{ data: AchievementSummary[] }>(
      withQuery(API_ENDPOINTS.SALESMAN_TARGET_ACHIEVEMENT_SUMMARIES, params),
    )
    return res.data ?? []
  }
}
