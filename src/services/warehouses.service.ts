import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Warehouse, CreateWarehouseDto, UpdateWarehouseDto } from '@/types/warehouse.type'
import { API_ENDPOINTS } from '@/constants/api'

export class WarehousesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_WAREHOUSES

  static async list(queryString?: string): Promise<Base<Warehouse>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Warehouse>>(url)
  }

  static async create(data: CreateWarehouseDto): Promise<Warehouse> {
    return ApiService.post<Warehouse>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateWarehouseDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
