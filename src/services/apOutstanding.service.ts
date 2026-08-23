import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { ApOutstandingItem } from '@/types/apOutstanding.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Read-only service over `ap_open_items` — approved AP invoices and approved
 * credit/debit notes, sign-adjusted. Nothing writes through this endpoint; it exists
 * to preview the netting AP Payment will eventually perform.
 *
 * The endpoint takes bespoke query parameters (`supplierId`, `documentType`, `branchId`,
 * `page`, `limit`) rather than GenericQueryBuilder triples, though `page`/`limit` happen
 * to match what `TableComponent` sends.
 */
export class ApOutstandingService {
  private static readonly BASE_URL = API_ENDPOINTS.AP_OUTSTANDING

  /**
   * @param queryString - Pre-built query string, e.g. from `TableComponent`'s `url` prop
   * @returns Promise resolving to the paginated open-item rows
   */
  static async list(queryString?: string): Promise<Base<ApOutstandingItem>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<ApOutstandingItem>>(url)
  }
}
