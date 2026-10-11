import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { ApiError } from '@/types/api.type'
import type { MustSellListConfig, UpsertMustSellListConfigDto } from '@/types/mustSellList.type'

/**
 * The per-branch customer-category level that new must sell lists are created with.
 * A branch without a config cannot create lists.
 */
export class MustSellListConfigService {
  /** The config of one of the caller's branches, or null when the branch has none. */
  static async getMyBranch(branchId: number): Promise<MustSellListConfig | null> {
    try {
      return await ApiService.get<MustSellListConfig>(
        `${API_ENDPOINTS.MUST_SELL_LIST_CONFIG_MY_BRANCH}?branchId=${branchId}`,
      )
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  static async list(): Promise<MustSellListConfig[]> {
    return ApiService.get<MustSellListConfig[]>(API_ENDPOINTS.MUST_SELL_LIST_CONFIGS)
  }

  /** Lists already created keep the level they were created with. */
  static async upsert(
    branchId: number,
    dto: UpsertMustSellListConfigDto,
  ): Promise<MustSellListConfig> {
    return ApiService.put<MustSellListConfig>(
      API_ENDPOINTS.MUST_SELL_LIST_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.MUST_SELL_LIST_CONFIG_BY_BRANCH(branchId))
  }
}
