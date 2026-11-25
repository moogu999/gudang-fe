import ApiService from './api'
import type {
  GoodsReceiptHeader,
  GoodsReceiptResponse,
  CreateGoodsReceiptRequest,
  UpdateGoodsReceiptRequest,
  AvailablePurchaseOrder,
} from '@/types/goodsReceipt.type'
import type { Base } from '@/types/api.type'
import { API_ENDPOINTS } from '@/constants/api'

export class GoodsReceiptsService {
  private static readonly BASE_URL = API_ENDPOINTS.GOODS_RECEIPTS

  static async get(id: number): Promise<GoodsReceiptResponse> {
    return ApiService.get<GoodsReceiptResponse>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateGoodsReceiptRequest): Promise<GoodsReceiptHeader> {
    return ApiService.post<GoodsReceiptHeader>(this.BASE_URL, data)
  }

  static async update(id: number, data: UpdateGoodsReceiptRequest): Promise<GoodsReceiptHeader> {
    return ApiService.put<GoodsReceiptHeader>(API_ENDPOINTS.GOODS_RECEIPT_BY_ID(id), data)
  }

  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.GOODS_RECEIPT_BY_ID(id))
  }

  /**
   * List purchase orders open for receiving (status approved/partially_received
   * with remaining quantity), for the PO-reference picker.
   *
   * @param branchId - the receipt's branch: a receipt must be on its PO's branch, so
   *   only that branch's POs are listed. Without it the backend lists the POs of all
   *   the caller's branches.
   */
  static async listAvailablePurchaseOrders(
    queryString?: string,
    branchId?: number,
  ): Promise<Base<AvailablePurchaseOrder>> {
    const params = new URLSearchParams(queryString)
    if (branchId !== undefined) params.set('branchId', String(branchId))
    const query = params.toString()
    const url = query
      ? `${API_ENDPOINTS.PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT}?${query}`
      : API_ENDPOINTS.PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT
    return ApiService.get<Base<AvailablePurchaseOrder>>(url)
  }
}
