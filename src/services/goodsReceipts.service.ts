import ApiService from './api'
import type {
  GoodsReceiptHeader,
  GoodsReceiptResponse,
  CreateGoodsReceiptRequest,
} from '@/types/goodsReceipt.type'
import { API_ENDPOINTS } from '@/constants/api'

export class GoodsReceiptsService {
  private static readonly BASE_URL = API_ENDPOINTS.GOODS_RECEIPTS

  static async get(id: number): Promise<GoodsReceiptResponse> {
    return ApiService.get<GoodsReceiptResponse>(`${this.BASE_URL}/${id}`)
  }

  static async create(data: CreateGoodsReceiptRequest): Promise<GoodsReceiptHeader> {
    return ApiService.post<GoodsReceiptHeader>(this.BASE_URL, data)
  }
}
