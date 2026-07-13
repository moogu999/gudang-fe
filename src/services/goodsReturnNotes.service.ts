import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  GoodsReturnNoteListItem,
  GoodsReturnNoteDetail,
  CreateGoodsReturnNoteRequest,
  CreateGoodsReturnNoteResponse,
  AvailableDriver,
  DriverStockItem,
} from '@/types/goodsReturnNote.type'
import { API_ENDPOINTS } from '@/constants/api'

export class GoodsReturnNotesService {
  static async list(queryString?: string): Promise<Base<GoodsReturnNoteListItem>> {
    const url = queryString
      ? `${API_ENDPOINTS.GOODS_RETURN_NOTES}?${queryString}`
      : API_ENDPOINTS.GOODS_RETURN_NOTES
    return ApiService.get<Base<GoodsReturnNoteListItem>>(url)
  }

  static async get(id: number): Promise<GoodsReturnNoteDetail> {
    return ApiService.get<GoodsReturnNoteDetail>(API_ENDPOINTS.GOODS_RETURN_NOTE_BY_ID(id))
  }

  static async create(
    payload: CreateGoodsReturnNoteRequest,
  ): Promise<CreateGoodsReturnNoteResponse> {
    return ApiService.post<CreateGoodsReturnNoteResponse>(API_ENDPOINTS.GOODS_RETURN_NOTES, payload)
  }

  static async listAvailableDrivers(): Promise<AvailableDriver[]> {
    const res = await ApiService.get<{ data: AvailableDriver[] }>(
      API_ENDPOINTS.GOODS_RETURN_NOTE_AVAILABLE_DRIVERS,
    )
    return res.data
  }

  static async listDriverStock(driverEmployeeId: number): Promise<DriverStockItem[]> {
    const res = await ApiService.get<{ data: DriverStockItem[] }>(
      `${API_ENDPOINTS.GOODS_RETURN_NOTE_DRIVER_STOCK}?driverEmployeeId=${driverEmployeeId}`,
    )
    return res.data
  }
}
