import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { ApiError } from '@/types/api.type'
import type {
  SalesmanTargetConfig,
  UpsertSalesmanTargetConfigDto,
} from '@/types/salesmanTarget.type'

/**
 * The per-branch level (product or category) that new salesman targets are created with.
 * A branch without a config cannot create targets.
 */
export class SalesmanTargetConfigService {
  /** The config of one of the caller's branches, or null when the branch has none. */
  static async getMyBranch(branchId: number): Promise<SalesmanTargetConfig | null> {
    try {
      return await ApiService.get<SalesmanTargetConfig>(
        `${API_ENDPOINTS.SALESMAN_TARGET_CONFIG_MY_BRANCH}?branchId=${branchId}`,
      )
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  static async list(): Promise<SalesmanTargetConfig[]> {
    return ApiService.get<SalesmanTargetConfig[]>(API_ENDPOINTS.SALESMAN_TARGET_CONFIGS)
  }

  /** Targets already created keep the level they were created with. */
  static async upsert(
    branchId: number,
    dto: UpsertSalesmanTargetConfigDto,
  ): Promise<SalesmanTargetConfig> {
    return ApiService.put<SalesmanTargetConfig>(
      API_ENDPOINTS.SALESMAN_TARGET_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.SALESMAN_TARGET_CONFIG_BY_BRANCH(branchId))
  }
}
