import ApiService from './api'
import type {
  PurchaseOrderHeader,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from '@/types/purchaseOrder.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for creating and updating purchase orders.
 * Handles POST/PUT requests for the header + details in a single transaction.
 *
 * @example
 * ```typescript
 * const newOrder = await PurchaseOrdersService.create({
 *   supplierId: 1,
 *   paymentTermId: 1,
 *   orderDate: '2026-07-27',
 *   status: 'draft',
 *   details: [{ productId: 10, quantity: '50.0000', price: '145000.00' }],
 * })
 * ```
 */
export class PurchaseOrdersService {
  private static readonly BASE_URL = API_ENDPOINTS.PURCHASE_ORDERS

  /**
   * Create a new purchase order with details
   *
   * @param data - Purchase order header and details
   * @returns Promise resolving to the created purchase order header
   * @throws Error if validation fails or creation fails
   */
  static async create(data: CreatePurchaseOrderRequest): Promise<PurchaseOrderHeader> {
    return ApiService.post<PurchaseOrderHeader>(this.BASE_URL, data)
  }

  /**
   * Update an existing draft purchase order
   *
   * @param id - Purchase order header ID
   * @param data - Purchase order header and details
   * @returns Promise resolving to the updated purchase order header
   * @throws Error if the order is not in draft status or validation fails
   */
  static async update(id: number, data: UpdatePurchaseOrderRequest): Promise<PurchaseOrderHeader> {
    return ApiService.put<PurchaseOrderHeader>(API_ENDPOINTS.PURCHASE_ORDER_BY_ID(id), data)
  }
}
