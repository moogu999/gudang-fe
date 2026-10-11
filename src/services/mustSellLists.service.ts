import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'
import type { Base } from '@/types/api.type'
import type {
  CreateMustSellListRequest,
  MslCustomer,
  MslCustomerQuery,
  MslDuplicateResponse,
  MslPreview,
  MslPreviewRequest,
  MslProductOption,
  MslProductOptionQuery,
  MustSellList,
  MustSellListListResponse,
  UpdateMustSellListRequest,
} from '@/types/mustSellList.type'

/** The filters `/v1/must-sell-lists` reads by name. */
const toListQuery = createListQueryAdapter([
  'branchId',
  'principalOptionId',
  'scopeOptionId',
  'status',
])

function withQuery(url: string, params: URLSearchParams): string {
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/**
 * Must sell lists: the products salesmen must offer for one principal, in one period, to the
 * customers of a scope. Every route is scoped to the caller's branches; another branch's list
 * reads as 404.
 */
export class MustSellListsService {
  /**
   * Translates a generic CRUD query string into the parameters `/v1/must-sell-lists` reads.
   * Pass it as `TableComponent`'s `query-adapter`.
   */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<MustSellListListResponse> {
    const url = API_ENDPOINTS.MUST_SELL_LISTS
    return ApiService.get<MustSellListListResponse>(queryString ? `${url}?${queryString}` : url)
  }

  static async get(id: number): Promise<MustSellList> {
    return ApiService.get<MustSellList>(API_ENDPOINTS.MUST_SELL_LIST_BY_ID(id))
  }

  static async create(body: CreateMustSellListRequest): Promise<MustSellList> {
    return ApiService.post<MustSellList>(API_ENDPOINTS.MUST_SELL_LISTS, body)
  }

  /** What can change depends on the status. 409 `MSL_STALE` on an old version. */
  static async update(id: number, body: UpdateMustSellListRequest): Promise<MustSellList> {
    return ApiService.put<MustSellList>(API_ENDPOINTS.MUST_SELL_LIST_BY_ID(id), body)
  }

  /** Only a draft can be deleted. */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.MUST_SELL_LIST_BY_ID(id))
  }

  static async publish(id: number, version: number): Promise<MustSellList> {
    return ApiService.post<MustSellList>(API_ENDPOINTS.MUST_SELL_LIST_PUBLISH(id), { version })
  }

  /** Scheduled lists only. */
  static async unpublish(id: number, version: number): Promise<MustSellList> {
    return ApiService.post<MustSellList>(API_ENDPOINTS.MUST_SELL_LIST_UNPUBLISH(id), { version })
  }

  /** Active lists only; the list ends after today. */
  static async endEarly(id: number, version: number): Promise<MustSellList> {
    return ApiService.post<MustSellList>(API_ENDPOINTS.MUST_SELL_LIST_END_EARLY(id), { version })
  }

  static async duplicate(id: number): Promise<MslDuplicateResponse> {
    return ApiService.post<MslDuplicateResponse>(API_ENDPOINTS.MUST_SELL_LIST_DUPLICATE(id), {})
  }

  /** Reach and overlaps of an unsaved list. A read; nothing is stored. */
  static async preview(body: MslPreviewRequest): Promise<MslPreview> {
    return ApiService.post<MslPreview>(API_ENDPOINTS.MUST_SELL_LISTS_PREVIEW, body)
  }

  static async customers(query: MslCustomerQuery): Promise<Base<MslCustomer>> {
    const params = new URLSearchParams({
      branchId: String(query.branchId),
      scopeLevel: query.scopeLevel,
    })
    if (query.scopeAll) params.set('scopeAll', 'true')
    if (query.scopeValueIds.length) params.set('scopeValueIds', query.scopeValueIds.join(','))
    if (query.q) params.set('q', query.q)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<MslCustomer>>(
      withQuery(API_ENDPOINTS.MUST_SELL_LISTS_CUSTOMERS, params),
    )
  }

  /** Products of a principal that can be added to a list. */
  static async productOptions(query: MslProductOptionQuery): Promise<Base<MslProductOption>> {
    const params = new URLSearchParams({ principalOptionId: String(query.principalOptionId) })
    if (query.categoryOptionId) params.set('categoryOptionId', String(query.categoryOptionId))
    if (query.excludeIds?.length) params.set('excludeIds', query.excludeIds.join(','))
    if (query.all) params.set('all', 'true')
    if (query.q) params.set('q', query.q)
    if (query.limit) params.set('limit', String(query.limit))
    if (query.offset) params.set('offset', String(query.offset))
    return ApiService.get<Base<MslProductOption>>(
      withQuery(API_ENDPOINTS.MUST_SELL_LISTS_PRODUCT_OPTIONS, params),
    )
  }
}
