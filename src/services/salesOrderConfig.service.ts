import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { SalesOrderConfig, UpsertSalesOrderConfigDto } from '@/types/salesOrderConfig.type'

export class SalesOrderConfigService {
  static async getMyBranch(): Promise<SalesOrderConfig | null> {
    try {
      return await ApiService.get<SalesOrderConfig>(API_ENDPOINTS.SALES_ORDER_CONFIG_MY_BRANCH)
    } catch {
      return null
    }
  }

  static async list(): Promise<SalesOrderConfig[]> {
    return ApiService.get<SalesOrderConfig[]>(API_ENDPOINTS.SALES_ORDER_CONFIGS)
  }

  static async upsert(branchId: number, dto: UpsertSalesOrderConfigDto): Promise<SalesOrderConfig> {
    return ApiService.put<SalesOrderConfig>(
      API_ENDPOINTS.SALES_ORDER_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.SALES_ORDER_CONFIG_BY_BRANCH(branchId))
  }
}
