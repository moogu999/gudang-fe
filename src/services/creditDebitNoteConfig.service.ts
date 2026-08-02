import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type {
  CreditDebitNoteConfig,
  UpsertCreditDebitNoteConfigDto,
} from '@/types/creditDebitNoteConfig.type'

/**
 * Service for the branch-scoped Credit/Debit Note approval configuration.
 * Unlike every other document, a branch without a config (or with a null
 * `approvalFlowId`) cannot post a note at all — approval is mandatory here.
 */
export class CreditDebitNoteConfigService {
  /**
   * Fetch the config for the caller's primary branch, or null when none exists.
   */
  static async getMyBranch(): Promise<CreditDebitNoteConfig | null> {
    try {
      return await ApiService.get<CreditDebitNoteConfig>(
        API_ENDPOINTS.CREDIT_DEBIT_NOTE_CONFIG_MY_BRANCH,
      )
    } catch {
      return null
    }
  }

  /**
   * List the configs of every branch assigned to the caller.
   */
  static async list(): Promise<CreditDebitNoteConfig[]> {
    return ApiService.get<CreditDebitNoteConfig[]>(API_ENDPOINTS.CREDIT_DEBIT_NOTE_CONFIGS)
  }

  /**
   * Create or replace a branch's config.
   *
   * @param branchId - Branch the config applies to
   * @param dto - Approval flow to apply; omit or null to disable posting altogether
   */
  static async upsert(
    branchId: number,
    dto: UpsertCreditDebitNoteConfigDto,
  ): Promise<CreditDebitNoteConfig> {
    return ApiService.put<CreditDebitNoteConfig>(
      API_ENDPOINTS.CREDIT_DEBIT_NOTE_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  /**
   * Remove a branch's config, which reverts it to needing no approval configured
   * (and therefore unable to post at all).
   */
  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.CREDIT_DEBIT_NOTE_CONFIG_BY_BRANCH(branchId))
  }
}
