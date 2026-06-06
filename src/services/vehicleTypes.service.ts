import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { VehicleType } from '@/types/vehicleType.type'
import { API_ENDPOINTS } from '@/constants/api'

export class VehicleTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_VEHICLE_TYPES

  static async list(queryString?: string): Promise<Base<VehicleType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<VehicleType>>(url)
  }
}
