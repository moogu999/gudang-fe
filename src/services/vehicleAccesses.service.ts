import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { VehicleAccess } from '@/types/customer.type'
import { API_ENDPOINTS } from '@/constants/api'

export class VehicleAccessesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_VEHICLE_ACCESSES

  static async list(queryString?: string): Promise<Base<VehicleAccess>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<VehicleAccess>>(url)
  }
}
