import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CustomerOutletType } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

export class CustomerOutletTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CUSTOMER_OUTLET_TYPES

  static async list(queryString?: string): Promise<Base<CustomerOutletType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CustomerOutletType>>(url)
  }
}
