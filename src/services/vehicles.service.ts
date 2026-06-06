import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '@/types/vehicle.type'
import { API_ENDPOINTS } from '@/constants/api'

export class VehiclesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_VEHICLES

  static async list(queryString?: string): Promise<Base<Vehicle>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Vehicle>>(url)
  }

  static async get(id: number): Promise<Vehicle> {
    return ApiService.get<Vehicle>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateVehicleDto): Promise<Vehicle> {
    return ApiService.post<Vehicle>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateVehicleDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
