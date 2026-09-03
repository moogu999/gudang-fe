import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { ControlAccountType } from '@/types/chartOfAccount.type'
import { API_ENDPOINTS } from '@/constants/api'

export class ControlAccountTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CONTROL_ACCOUNT_TYPES

  static async list(queryString?: string): Promise<Base<ControlAccountType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<ControlAccountType>>(url)
  }
}
