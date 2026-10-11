import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CompetitorBrand,
  CompetitorBrandListQuery,
  CompetitorBrandPayload,
} from '@/types/competitorBrand.type'
import { API_ENDPOINTS } from '@/constants/api'

/** Competitor brands. The list is small and comes back unpaged. */
export class CompetitorBrandsService {
  private static readonly BASE_URL = API_ENDPOINTS.COMPETITOR_BRANDS

  static async list(query: CompetitorBrandListQuery = {}): Promise<Base<CompetitorBrand>> {
    const params = new URLSearchParams()
    if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
    if (query.search) params.set('search', query.search)
    const qs = params.toString()
    return ApiService.get<Base<CompetitorBrand>>(qs ? `${this.BASE_URL}?${qs}` : this.BASE_URL)
  }

  /** For an `InfiniteSelect`, which sends the generic query dialect. */
  static async listForSelect(queryString?: string): Promise<Base<CompetitorBrand>> {
    const from = new URLSearchParams(queryString ?? '')
    const query: CompetitorBrandListQuery = { search: from.get('search') ?? undefined }
    from.getAll('filterBy').forEach((by, i) => {
      if (by === 'isActive') query.isActive = from.getAll('filterValue')[i] === 'true'
    })
    return this.list(query)
  }

  static async get(id: number): Promise<CompetitorBrand> {
    return ApiService.get<CompetitorBrand>(`${this.BASE_URL}/${id}`)
  }

  static async create(payload: CompetitorBrandPayload): Promise<CompetitorBrand> {
    return ApiService.post<CompetitorBrand>(this.BASE_URL, payload)
  }

  static async update(id: number, payload: CompetitorBrandPayload): Promise<CompetitorBrand> {
    return ApiService.put<CompetitorBrand>(`${this.BASE_URL}/${id}`, payload)
  }

  /** 409 `competitor_brand_in_use` while products still use the brand. */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
