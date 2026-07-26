import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { Supplier, CreateSupplierDto, UpdateSupplierDto } from '@/types/supplier.type'
import { API_ENDPOINTS } from '@/constants/api'

export class SuppliersService {
  private static readonly BASE_URL = API_ENDPOINTS.SUPPLIERS

  static async list(queryString?: string): Promise<Base<Supplier>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<Supplier>>(url)
  }

  static async get(id: number): Promise<Supplier> {
    return ApiService.get<Supplier>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateSupplierDto): Promise<Supplier> {
    return ApiService.post<Supplier>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateSupplierDto): Promise<Supplier> {
    return ApiService.put<Supplier>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
