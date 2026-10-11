import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CompetitorProduct,
  CompetitorProductPayload,
  CompetitorProductRecommendation,
  RecommendationListQuery,
} from '@/types/competitorProduct.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * The review side of competitor product recommendations. Submitting is the
 * mobile app's job, so there is no `submit` here.
 */
export class CompetitorProductRecommendationsService {
  private static readonly BASE_URL = API_ENDPOINTS.COMPETITOR_PRODUCT_RECOMMENDATIONS

  static async list(
    query: RecommendationListQuery = {},
  ): Promise<Base<CompetitorProductRecommendation>> {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    const qs = params.toString()
    return ApiService.get<Base<CompetitorProductRecommendation>>(
      qs ? `${this.BASE_URL}?${qs}` : this.BASE_URL,
    )
  }

  static async get(id: number): Promise<CompetitorProductRecommendation> {
    return ApiService.get<CompetitorProductRecommendation>(`${this.BASE_URL}/${id}`)
  }

  /** 409 `recommendation_not_pending` / `competitor_product_inactive`. */
  static async merge(
    competitorProductId: number,
    recommendationIds: number[],
  ): Promise<{ data: CompetitorProductRecommendation[] }> {
    return ApiService.post<{ data: CompetitorProductRecommendation[] }>(`${this.BASE_URL}/merge`, {
      competitorProductId,
      recommendationIds,
    })
  }

  static async createProduct(
    product: CompetitorProductPayload,
    recommendationIds: number[],
    photoFileIds: number[],
  ): Promise<CompetitorProduct> {
    return ApiService.post<CompetitorProduct>(`${this.BASE_URL}/create-product`, {
      product,
      recommendationIds,
      photoFileIds,
    })
  }

  static async reject(id: number, reason?: string): Promise<CompetitorProductRecommendation> {
    return ApiService.post<CompetitorProductRecommendation>(
      `${this.BASE_URL}/${id}/reject`,
      reason ? { reason } : {},
    )
  }
}
