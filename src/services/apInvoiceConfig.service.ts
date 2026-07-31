import ApiService from './api'
import { API_ENDPOINTS } from '@/constants/api'
import type { ApInvoiceConfig, UpsertApInvoiceConfigDto } from '@/types/apInvoiceConfig.type'

/**
 * Service for the branch-scoped AP Invoice approval configuration.
 * A branch without a config (or with a null `approvalFlowId`) needs no approval.
 */
export class ApInvoiceConfigService {
  /**
   * Fetch the config for the caller's primary branch, or null when none exists.
   */
  static async getMyBranch(): Promise<ApInvoiceConfig | null> {
    try {
      return await ApiService.get<ApInvoiceConfig>(API_ENDPOINTS.AP_INVOICE_CONFIG_MY_BRANCH)
    } catch {
      return null
    }
  }

  /**
   * List the configs of every branch assigned to the caller.
   */
  static async list(): Promise<ApInvoiceConfig[]> {
    return ApiService.get<ApInvoiceConfig[]>(API_ENDPOINTS.AP_INVOICE_CONFIGS)
  }

  /**
   * Create or replace a branch's config.
   *
   * @param branchId - Branch the config applies to
   * @param dto - Approval flow to apply; omit or null to disable approval
   */
  static async upsert(branchId: number, dto: UpsertApInvoiceConfigDto): Promise<ApInvoiceConfig> {
    return ApiService.put<ApInvoiceConfig>(API_ENDPOINTS.AP_INVOICE_CONFIG_BY_BRANCH(branchId), dto)
  }

  /**
   * Remove a branch's config, which reverts it to needing no approval.
   */
  static async delete(branchId: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.AP_INVOICE_CONFIG_BY_BRANCH(branchId))
  }
}
