import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { JourneyPlanConfig, UpsertJourneyPlanConfigDto } from '@/types/journeyPlan.type'

/**
 * The per-branch journey plan settings. A branch without a stored config gets the
 * defaults (`isDefault`), so reading never fails for a missing row.
 */
export class JourneyPlanConfigService {
  static async getMyBranch(branchId: number): Promise<JourneyPlanConfig> {
    return ApiService.get<JourneyPlanConfig>(
      `${API_ENDPOINTS.JOURNEY_PLAN_CONFIG_MY_BRANCH}?branchId=${branchId}`,
    )
  }

  static async list(): Promise<JourneyPlanConfig[]> {
    return ApiService.get<JourneyPlanConfig[]>(API_ENDPOINTS.JOURNEY_PLAN_CONFIGS)
  }

  /** The cycle anchor can only change while the branch has no journey plans. */
  static async upsert(
    branchId: number,
    dto: UpsertJourneyPlanConfigDto,
  ): Promise<JourneyPlanConfig> {
    return ApiService.put<JourneyPlanConfig>(
      API_ENDPOINTS.JOURNEY_PLAN_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.JOURNEY_PLAN_CONFIG_BY_BRANCH(branchId))
  }
}
