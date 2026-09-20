import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { CashDepositConfig, UpsertCashDepositConfigDto } from '@/types/cashDeposit.type'

/**
 * Service for the branch-scoped Cash Deposit variance threshold + approval flow.
 * A branch with no config, or one with no flow, never requires approval.
 */
export class CashDepositConfigService {
  /** Fetch the config for the caller's primary branch, or null when none exists. */
  static async getMyBranch(): Promise<CashDepositConfig | null> {
    try {
      return await ApiService.get<CashDepositConfig>(API_ENDPOINTS.CASH_DEPOSIT_CONFIG_MY_BRANCH)
    } catch {
      return null
    }
  }

  static async list(): Promise<CashDepositConfig[]> {
    return ApiService.get<CashDepositConfig[]>(API_ENDPOINTS.CASH_DEPOSIT_CONFIGS)
  }

  static async upsert(
    branchId: number,
    dto: UpsertCashDepositConfigDto,
  ): Promise<CashDepositConfig> {
    return ApiService.put<CashDepositConfig>(
      API_ENDPOINTS.CASH_DEPOSIT_CONFIG_BY_BRANCH(branchId),
      dto,
    )
  }

  /** Remove a branch's config, which reverts it to never requiring approval. */
  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.CASH_DEPOSIT_CONFIG_BY_BRANCH(branchId))
  }
}
