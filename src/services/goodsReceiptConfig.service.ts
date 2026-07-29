import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type {
  GoodsReceiptConfig,
  UpsertGoodsReceiptConfigDto,
} from '@/types/goodsReceiptConfig.type'

export class GoodsReceiptConfigService {
  static async getMyBranch(): Promise<GoodsReceiptConfig | null> {
    try {
      return await ApiService.get<GoodsReceiptConfig>(API_ENDPOINTS.GOODS_RECEIPT_CONFIG_MY_BRANCH)
    } catch {
      return null
    }
  }

  static async list(): Promise<GoodsReceiptConfig[]> {
    return ApiService.get<GoodsReceiptConfig[]>(API_ENDPOINTS.GOODS_RECEIPT_CONFIGS)
  }

  static async upsert(
    branchId: number,
    dto: UpsertGoodsReceiptConfigDto,
  ): Promise<GoodsReceiptConfig> {
    return ApiService.put<GoodsReceiptConfig>(
      API_ENDPOINTS.GOODS_RECEIPT_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.GOODS_RECEIPT_CONFIG_BY_BRANCH(branchId))
  }
}
