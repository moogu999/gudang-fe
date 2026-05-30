import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { CustomerChannel } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

export class CustomerChannelsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_CUSTOMER_CHANNELS

  static async list(queryString?: string): Promise<Base<CustomerChannel>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<CustomerChannel>>(url)
  }
}
