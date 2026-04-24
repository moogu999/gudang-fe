import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CriteriaType } from '@/types/price-matrix.type'
import { API_ENDPOINTS } from '@/constants/api'

export class CriteriaTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CRITERIA_TYPES

  static async list(queryString?: string): Promise<Base<CriteriaType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CriteriaType>>(url)
  }
}
