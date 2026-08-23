import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { ApPaymentConfig, UpsertApPaymentConfigDto } from '@/types/apPaymentConfig.type'

/**
 * Service for the branch-scoped AP Payment approval configuration. Unlike every
 * other module, this one is amount-aware: a `null` `approvalThreshold` means
 * every payment requires approval, and a branch with no config row behaves the
 * same way (`ApPaymentConfigData.RequiresApproval`'s safe default).
 */
export class ApPaymentConfigService {
  /**
   * Fetch the config for the caller's primary branch, or null when none exists.
   */
  static async getMyBranch(): Promise<ApPaymentConfig | null> {
    try {
      return await ApiService.get<ApPaymentConfig>(API_ENDPOINTS.AP_PAYMENT_CONFIG_MY_BRANCH)
    } catch {
      return null
    }
  }

  /**
   * List the configs of every branch assigned to the caller.
   */
  static async list(): Promise<ApPaymentConfig[]> {
    return ApiService.get<ApPaymentConfig[]>(API_ENDPOINTS.AP_PAYMENT_CONFIGS)
  }

  /**
   * Create or replace a branch's config.
   *
   * @param branchId - Branch the config applies to
   * @param dto - Approval flow and/or threshold; omit or null on either to leave it unconfigured
   */
  static async upsert(branchId: number, dto: UpsertApPaymentConfigDto): Promise<ApPaymentConfig> {
    return ApiService.put<ApPaymentConfig>(API_ENDPOINTS.AP_PAYMENT_CONFIG_BY_BRANCH(branchId), dto)
  }

  /**
   * Remove a branch's config, which reverts it to requiring approval on every payment.
   */
  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.AP_PAYMENT_CONFIG_BY_BRANCH(branchId))
  }
}
