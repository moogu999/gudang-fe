import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type { Base } from '@/types/api.type'
import type { MslCustomer } from '@/types/mustSellList.type'
import type {
  CreateSurveyRequest,
  Survey,
  SurveyCustomerQuery,
  SurveyDuplicateResponse,
  SurveyGridProduct,
  SurveyListResponse,
  SurveyPreview,
  SurveyPreviewRequest,
  SurveyProductOptionQuery,
  SurveySalesTeamOption,
  UpdateSurveyRequest,
} from '@/types/survey.type'
import type { MslProductOption } from '@/types/mustSellList.type'

/** The filters `/v1/surveys` reads by name. */
const toListQuery = createListQueryAdapter([
  'branchId',
  'principalOptionId',
  'type',
  'frequency',
  'status',
])

function withQuery(url: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Surveys: a regular questionnaire or a stock check, for one branch and period, shown to the
 * customers and salesmen in its scope. Every route is scoped to the caller's branches; another
 * branch's survey reads as 404.
 */
export class SurveysService {
  /**
   * Translates a generic CRUD query string into the parameters `/v1/surveys` reads.
   * Pass it as `TableComponent`'s `query-adapter`.
   */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<SurveyListResponse> {
    const url = API_ENDPOINTS.SURVEYS
    return ApiService.get<SurveyListResponse>(queryString ? `${url}?${queryString}` : url)
  }

  static async get(id: number): Promise<Survey> {
    return ApiService.get<Survey>(API_ENDPOINTS.SURVEY_BY_ID(id))
  }

  static async create(body: CreateSurveyRequest): Promise<Survey> {
    return ApiService.post<Survey>(API_ENDPOINTS.SURVEYS, body)
  }

  /** What can change depends on the status. 409 `SURVEY_STALE` on an old version. */
  static async update(id: number, body: UpdateSurveyRequest): Promise<Survey> {
    return ApiService.put<Survey>(API_ENDPOINTS.SURVEY_BY_ID(id), body)
  }

  /** Only a draft can be deleted. */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.SURVEY_BY_ID(id))
  }

  static async publish(id: number, version: number): Promise<Survey> {
    return ApiService.post<Survey>(API_ENDPOINTS.SURVEY_PUBLISH(id), { version })
  }

  /** Scheduled surveys only. */
  static async unpublish(id: number, version: number): Promise<Survey> {
    return ApiService.post<Survey>(API_ENDPOINTS.SURVEY_UNPUBLISH(id), { version })
  }

  /** Active surveys only; the survey ends after today. */
  static async endEarly(id: number, version: number): Promise<Survey> {
    return ApiService.post<Survey>(API_ENDPOINTS.SURVEY_END_EARLY(id), { version })
  }

  static async duplicate(id: number): Promise<SurveyDuplicateResponse> {
    return ApiService.post<SurveyDuplicateResponse>(API_ENDPOINTS.SURVEY_DUPLICATE(id), {})
  }

  /** Reach of an unsaved survey. A read; nothing is stored. */
  static async preview(body: SurveyPreviewRequest): Promise<SurveyPreview> {
    return ApiService.post<SurveyPreview>(API_ENDPOINTS.SURVEYS_PREVIEW, body)
  }

  static async customers(query: SurveyCustomerQuery): Promise<Base<MslCustomer>> {
    const params = new URLSearchParams({
      branchId: String(query.branchId),
      scopeLevel: query.scopeLevel,
    })
    if (query.scopeAll) params.set('scopeAll', 'true')
    if (query.scopeValueIds.length) params.set('scopeValueIds', query.scopeValueIds.join(','))
    if (query.q) params.set('q', query.q)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<MslCustomer>>(withQuery(API_ENDPOINTS.SURVEYS_CUSTOMERS, params))
  }

  /** Products that can be added to a stock check; all products when no principal is given. */
  static async productOptions(query: SurveyProductOptionQuery): Promise<Base<MslProductOption>> {
    const params = new URLSearchParams()
    if (query.principalOptionId) params.set('principalOptionId', String(query.principalOptionId))
    if (query.categoryOptionId) params.set('categoryOptionId', String(query.categoryOptionId))
    if (query.excludeIds?.length) params.set('excludeIds', query.excludeIds.join(','))
    if (query.all) params.set('all', 'true')
    if (query.q) params.set('q', query.q)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<MslProductOption>>(
      withQuery(API_ENDPOINTS.SURVEYS_PRODUCT_OPTIONS, params),
    )
  }

  /** The live product list of a competitor grid, excluded products flagged. */
  static async competitorGridPreview(
    categoryOptionIds: number[],
    excludeIds: number[] = [],
  ): Promise<SurveyGridProduct[]> {
    const params = new URLSearchParams({ categoryOptionIds: categoryOptionIds.join(',') })
    if (excludeIds.length) params.set('excludeIds', excludeIds.join(','))
    const res = await ApiService.get<{ data?: SurveyGridProduct[] }>(
      withQuery(API_ENDPOINTS.SURVEYS_COMPETITOR_GRID_PREVIEW, params),
    )
    return res.data ?? []
  }

  /** Active sales teams of a branch. */
  static async salesTeamOptions(branchId: number, q?: string): Promise<SurveySalesTeamOption[]> {
    const params = new URLSearchParams({ branchId: String(branchId) })
    if (q) params.set('q', q)
    const res = await ApiService.get<{ data?: SurveySalesTeamOption[] }>(
      withQuery(API_ENDPOINTS.SURVEYS_SALES_TEAM_OPTIONS, params),
    )
    return res.data ?? []
  }
}
