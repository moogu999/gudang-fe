import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CompetitorProduct,
  CompetitorProductListItem,
  CompetitorProductListQuery,
  CompetitorProductPayload,
} from '@/types/competitorProduct.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'

const adaptGenericQuery = createListQueryAdapter([
  'brandId',
  'categoryOptionId',
  'principalOptionId',
  'isActive',
])

/**
 * The list's `nextCursor` is the next page's offset, so an `InfiniteSelect`
 * following it sends that value back as `cursor`.
 */
function toListQuery(queryString?: string): string {
  const cursor = new URLSearchParams(queryString ?? '').get('cursor')
  const params = new URLSearchParams(adaptGenericQuery(queryString))
  if (cursor) params.set('offset', cursor)
  return params.toString()
}

export class CompetitorProductsService {
  private static readonly BASE_URL = API_ENDPOINTS.COMPETITOR_PRODUCTS

  /**
   * Rewrites a generic CRUD query string into the parameters
   * `/v1/competitor-products` reads. Pass it as `TableComponent`'s
   * `query-adapter`. The server orders by code, so no column is sortable.
   */
  static readonly toListQuery = toListQuery

  static async list(queryString?: string): Promise<Base<CompetitorProductListItem>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CompetitorProductListItem>>(url)
  }

  /** For an `InfiniteSelect`, which speaks the generic query dialect. */
  static async listForSelect(queryString?: string): Promise<Base<CompetitorProductListItem>> {
    return this.list(toListQuery(queryString))
  }

  /** Named-parameter variant for callers that don't go through a generic query. */
  static async query(q: CompetitorProductListQuery): Promise<Base<CompetitorProductListItem>> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(q)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    return this.list(params.toString())
  }

  static async get(id: number): Promise<CompetitorProduct> {
    return ApiService.get<CompetitorProduct>(`${this.BASE_URL}/${id}`)
  }

  static async create(payload: CompetitorProductPayload): Promise<CompetitorProduct> {
    return ApiService.post<CompetitorProduct>(this.BASE_URL, payload)
  }

  /** PUT replaces: an omitted price or principal is cleared. */
  static async update(id: number, payload: CompetitorProductPayload): Promise<CompetitorProduct> {
    return ApiService.put<CompetitorProduct>(`${this.BASE_URL}/${id}`, payload)
  }

  /** 409 `competitor_product_in_use` when something references the product. */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
