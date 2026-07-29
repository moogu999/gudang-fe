import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { PurchaseOrderDetail } from '@/types/purchaseOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing purchase order details
 * Used primarily for fetching details when viewing a purchase order
 *
 * @example
 * ```typescript
 * import { GenericQueryBuilder } from '@/services/genericQueryBuilder'
 * import FilterOperator from '@/constants/filterOperator'
 *
 * // Fetch details for a specific purchase order
 * const query = new GenericQueryBuilder()
 *   .withFilter('purchaseOrderHeaderId', FilterOperator.EQUAL, 123)
 *   .build()
 *
 * const details = await PurchaseOrderDetailsService.list(query)
 * ```
 */
export class PurchaseOrderDetailsService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PURCHASE_ORDER_DETAILS

  /**
   * Fetch purchase order details
   * Typically filtered by purchaseOrderHeaderId
   *
   * @param queryString - Optional query parameters for filtering
   * @returns Promise resolving to purchase order details
   */
  static async list(queryString?: string): Promise<Base<PurchaseOrderDetail>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<PurchaseOrderDetail>>(url)
  }
}
