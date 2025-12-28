import ApiService from './api'
import type { SalesOrderHeader, CreateSalesOrderRequest } from '@/types/salesOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for managing sales order creation
 * Handles POST requests for creating sales orders with details in a single transaction
 *
 * @example
 * ```typescript
 * const newOrder = await SalesOrdersService.create({
 *   no: 'SO-2024-001',
 *   orderDate: '2024-01-15',
 *   customerId: 1,
 *   details: [
 *     {
 *       productId: 10,
 *       quantity: 5,
 *       price: 250.00,
 *       discount: 10.00
 *     }
 *   ],
 *   createdBy: 1
 * })
 * ```
 */
export class SalesOrdersService {
  private static readonly BASE_URL = API_ENDPOINTS.SALES_ORDERS

  /**
   * Create a new sales order with details
   *
   * @param data - Sales order header and details
   * @returns Promise resolving to the created sales order header
   * @throws Error if validation fails or creation fails
   */
  static async create(data: CreateSalesOrderRequest): Promise<SalesOrderHeader> {
    return ApiService.post<SalesOrderHeader>(this.BASE_URL, data)
  }
}
