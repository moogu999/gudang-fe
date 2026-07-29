import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type {
  PurchaseOrderConfig,
  UpsertPurchaseOrderConfigDto,
} from '@/types/purchaseOrderConfig.type'

export class PurchaseOrderConfigService {
  static async getMyBranch(): Promise<PurchaseOrderConfig | null> {
    try {
      return await ApiService.get<PurchaseOrderConfig>(
        API_ENDPOINTS.PURCHASE_ORDER_CONFIG_MY_BRANCH,
      )
    } catch {
      return null
    }
  }

  static async list(): Promise<PurchaseOrderConfig[]> {
    return ApiService.get<PurchaseOrderConfig[]>(API_ENDPOINTS.PURCHASE_ORDER_CONFIGS)
  }

  static async upsert(
    branchId: number,
    dto: UpsertPurchaseOrderConfigDto,
  ): Promise<PurchaseOrderConfig> {
    return ApiService.put<PurchaseOrderConfig>(
      API_ENDPOINTS.PURCHASE_ORDER_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.PURCHASE_ORDER_CONFIG_BY_BRANCH(branchId))
  }
}
