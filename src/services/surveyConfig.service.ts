import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import { ApiError } from '@/types/api.type'
import type { SurveyConfig, UpsertSurveyConfigDto } from '@/types/survey.type'

/**
 * The per-branch survey settings: the customer-category level new surveys are created with,
 * what Required means on the phone, and the stock check's qty default.
 * A branch without a config cannot create surveys.
 */
export class SurveyConfigService {
  /** The config of one of the caller's branches, or null when the branch has none. */
  static async getMyBranch(branchId: number): Promise<SurveyConfig | null> {
    try {
      return await ApiService.get<SurveyConfig>(
        `${API_ENDPOINTS.SURVEY_CONFIG_MY_BRANCH}?branchId=${branchId}`,
      )
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  static async list(): Promise<SurveyConfig[]> {
    return ApiService.get<SurveyConfig[]>(API_ENDPOINTS.SURVEY_CONFIGS)
  }

  /** Surveys already created keep the level they were created with. */
  static async upsert(branchId: number, dto: UpsertSurveyConfigDto): Promise<SurveyConfig> {
    return ApiService.put<SurveyConfig>(API_ENDPOINTS.SURVEY_CONFIG_BY_BRANCH(branchId), dto)
  }

  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.SURVEY_CONFIG_BY_BRANCH(branchId))
  }
}
