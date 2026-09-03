import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { AccountType } from '@/types/chartOfAccount.type'
import { API_ENDPOINTS } from '@/constants/api'

export class AccountTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_ACCOUNT_TYPES

  static async list(queryString?: string): Promise<Base<AccountType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<AccountType>>(url)
  }
}
