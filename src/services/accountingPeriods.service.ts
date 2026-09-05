import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { AccountingPeriod, AccountingPeriodConfig } from '@/types/accountingPeriod.type'
import { API_ENDPOINTS } from '@/constants/api'

export class AccountingPeriodsService {
  private static readonly BASE_URL = API_ENDPOINTS.ACCOUNTING_PERIODS

  static async list(queryString?: string): Promise<Base<AccountingPeriod>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<AccountingPeriod>>(url)
  }

  /** 404s when the company has no open period — an expected outcome for the
   *  caller to catch, not a failure to toast. */
  static async current(companyId: number): Promise<AccountingPeriod> {
    return ApiService.get<AccountingPeriod>(
      `${API_ENDPOINTS.ACCOUNTING_PERIODS_CURRENT}?companyId=${companyId}`,
    )
  }

  static async open(id: number): Promise<AccountingPeriod> {
    return ApiService.post<AccountingPeriod>(API_ENDPOINTS.ACCOUNTING_PERIOD_OPEN(id), {})
  }

  static async close(id: number): Promise<AccountingPeriod> {
    return ApiService.post<AccountingPeriod>(API_ENDPOINTS.ACCOUNTING_PERIOD_CLOSE(id), {})
  }

  static async requestReopen(id: number): Promise<AccountingPeriod> {
    return ApiService.post<AccountingPeriod>(API_ENDPOINTS.ACCOUNTING_PERIOD_REQUEST_REOPEN(id), {})
  }

  static async permanentClose(id: number): Promise<AccountingPeriod> {
    return ApiService.post<AccountingPeriod>(
      API_ENDPOINTS.ACCOUNTING_PERIOD_PERMANENT_CLOSE(id),
      {},
    )
  }

  static async revertPermanentClose(id: number, reason: string): Promise<AccountingPeriod> {
    return ApiService.post<AccountingPeriod>(
      API_ENDPOINTS.ACCOUNTING_PERIOD_REVERT_PERMANENT_CLOSE(id),
      { reason },
    )
  }

  static async getConfig(companyId: number): Promise<AccountingPeriodConfig> {
    return ApiService.get<AccountingPeriodConfig>(API_ENDPOINTS.ACCOUNTING_PERIOD_CONFIG(companyId))
  }

  static async upsertConfig(
    companyId: number,
    reopenFlowId: number | null,
  ): Promise<AccountingPeriodConfig> {
    return ApiService.put<AccountingPeriodConfig>(
      API_ENDPOINTS.ACCOUNTING_PERIOD_CONFIG(companyId),
      { reopenFlowId },
    )
  }
}
