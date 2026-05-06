import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Promotion, PromotionListItem, CreatePromotionDto } from '@/types/promotion.type'
import { API_ENDPOINTS } from '@/constants/api'

export class PromotionsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PROMOTIONS
  private static readonly CUSTOM_URL = API_ENDPOINTS.PROMOTIONS

  static async list(queryString?: string): Promise<Base<PromotionListItem>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<PromotionListItem>>(url)
  }

  static async getById(id: number): Promise<Promotion> {
    return ApiService.get<Promotion>(`${this.CUSTOM_URL}/${id}`)
  }

  static async create(data: CreatePromotionDto): Promise<Promotion> {
    return ApiService.post<Promotion>(this.CUSTOM_URL, data)
  }

  static async update(id: number, data: CreatePromotionDto): Promise<Promotion> {
    return ApiService.put<Promotion>(`${this.CUSTOM_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
