import ApiService from './api'
import type { Base } from '@/types/api.type'
import type { SalesOrderHeader } from '@/types/salesOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing sales order headers
 * Handles generic CRUD operations via /gen/v1/sales-order-headers
 *
 * @example
 * ```typescript
 * // List sales orders with pagination
 * const orders = await SalesOrderHeadersService.list('page=1&limit=10')
 *
 * // Get a single sales order
 * const order = await SalesOrderHeadersService.getById(123)
 * ```
 */
export class SalesOrderHeadersService {
  private static readonly BASE_URL = API_ENDPOINTS.GEN_SALES_ORDER_HEADERS

  /**
   * Fetch paginated list of sales order headers
   * Used primarily by TableComponent for server-side data fetching
   *
   * @param queryString - Optional query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated sales order header data with metadata
   */
  static async list(queryString?: string): Promise<Base<SalesOrderHeader>> {
    const url = queryString ? `${this.BASE_URL}?${queryString}` : this.BASE_URL
    return ApiService.get<Base<SalesOrderHeader>>(url)
  }

  /**
   * Fetch a single sales order header by ID
   *
   * @param id - The unique identifier of the sales order
   * @returns Promise resolving to the sales order header object
   * @throws Error if sales order not found
   */
  static async getById(id: number): Promise<SalesOrderHeader> {
    return ApiService.get<SalesOrderHeader>(`${this.BASE_URL}/${id}`)
  }
}
