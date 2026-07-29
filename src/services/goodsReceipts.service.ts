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
   */
  static async listAvailablePurchaseOrders(
    queryString?: string,
  ): Promise<Base<AvailablePurchaseOrder>> {
    const url = queryString
      ? `${API_ENDPOINTS.PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT}?${queryString}`
      : API_ENDPOINTS.PURCHASE_ORDERS_AVAILABLE_FOR_RECEIPT
    return ApiService.get<Base<AvailablePurchaseOrder>>(url)
  }
}
