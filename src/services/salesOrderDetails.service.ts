import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { SalesOrderDetail } from '@/types/salesOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing sales order details
 * Used primarily for fetching details when viewing a sales order
 *
 * @example
 * ```typescript
 * import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
 * import FilterOperator from '@/constants/filterOperator'
 *
 * // Fetch details for a specific sales order
 * const query = new GenericQueryBuilder()
 *   .withFilter('salesOrderHeaderId', FilterOperator.EQUAL, 123)
 *   .build()
 *
 * const details = await SalesOrderDetailsService.list(query)
 * ```
 */
export class SalesOrderDetailsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_SALES_ORDER_DETAILS

  /**
   * Fetch sales order details
   * Typically filtered by salesOrderHeaderId
   *
   * @param queryString - Optional query parameters for filtering
   * @returns Promise resolving to sales order details
   */
  static async list(queryString?: string): Promise<Base<SalesOrderDetail>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SalesOrderDetail>>(url)
  }
}
