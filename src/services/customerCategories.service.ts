import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CustomerCategory } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

export class CustomerCategoriesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CUSTOMER_CATEGORIES

  static async list(queryString?: string): Promise<Base<CustomerCategory>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CustomerCategory>>(url)
  }
}
