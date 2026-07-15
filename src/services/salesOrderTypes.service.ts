import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  SalesOrderType,
  CreateSalesOrderTypeDto,
  UpdateSalesOrderTypeDto,
} from '@/types/salesOrderType.type'
import { API_ENDPOINTS } from '@/constants/api'

export class SalesOrderTypesService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_SALES_ORDER_TYPES

  static async list(queryString?: string): Promise<Base<SalesOrderType>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SalesOrderType>>(url)
  }

  static async create(data: CreateSalesOrderTypeDto): Promise<SalesOrderType> {
    return ApiService.post<SalesOrderType>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateSalesOrderTypeDto): Promise<void> {
    return ApiService.patch<void>(`${this.BASE_URL}/${id}`, data)
  }

  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }
}
