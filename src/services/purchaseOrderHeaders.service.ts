import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { PurchaseOrderHeader } from '@/types/purchaseOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing purchase order headers
 * Handles generic CRUD operations via /gen/v1/purchase-order-headers
 *
 * @example
 * ```typescript
 * // List purchase orders with pagination
 * const orders = await PurchaseOrderHeadersService.list('page=1&limit=10')
 *
 * // Get a single purchase order
 * const order = await PurchaseOrderHeadersService.getById(123)
 * ```
 */
export class PurchaseOrderHeadersService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_PURCHASE_ORDER_HEADERS

  /**
   * Fetch paginated list of purchase order headers
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated purchase order header data with metadata
   */
  static async list(queryString?: string): Promise<Base<PurchaseOrderHeader>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<PurchaseOrderHeader>>(url)
  }

  /**
   * Fetch a single purchase order header by ID
   *
   * @param id - The unique identifier of the purchase order
   * @returns Promise resolving to the purchase order header object
   * @throws Error if purchase order not found
   */
  static async getById(id: number): Promise<PurchaseOrderHeader> {
    return ApiService.get<PurchaseOrderHeader>(`${this.BASE_URL}/${id}`)
  }
}
