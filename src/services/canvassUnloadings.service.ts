import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CanvassUnloading,
  CanvassUnloadingRow,
  CanvassVanStock,
  SaveCanvassUnloadingRequest,
} from '@/types/canvassUnloading.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'

/** Canvass Unloading (Bongkar Kanvas): the warehouse records what a van returns. */
export class CanvassUnloadingsService {
  static readonly toListQuery = createListQueryAdapter([
    'status',
    'branchId',
    'salesmanId',
    'dateFrom',
    'dateTo',
  ])

  static async list(queryString?: string): Promise<Base<CanvassUnloadingRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.CANVASS_UNLOADINGS}?${queryString}`
      : API_ENDPOINTS.CANVASS_UNLOADINGS
    return ApiService.get<Base<CanvassUnloadingRow>>(url)
  }

  static async get(id: number): Promise<CanvassUnloading> {
    return ApiService.get<CanvassUnloading>(API_ENDPOINTS.CANVASS_UNLOADING_BY_ID(id))
  }

  /** Without `lines` the draft is prefilled with everything the van holds. */
  static async create(data: SaveCanvassUnloadingRequest): Promise<CanvassUnloading> {
    return ApiService.post<CanvassUnloading>(API_ENDPOINTS.CANVASS_UNLOADINGS, data)
  }

  static async update(id: number, data: SaveCanvassUnloadingRequest): Promise<CanvassUnloading> {
    return ApiService.put<CanvassUnloading>(API_ENDPOINTS.CANVASS_UNLOADING_BY_ID(id), data)
  }

  static async post(id: number): Promise<CanvassUnloading> {
    return ApiService.post<CanvassUnloading>(API_ENDPOINTS.CANVASS_UNLOADING_POST(id), {})
  }

  static async cancel(id: number): Promise<CanvassUnloading> {
    return ApiService.post<CanvassUnloading>(API_ENDPOINTS.CANVASS_UNLOADING_CANCEL(id), {})
  }

  static async vanStock(warehouseId: number): Promise<CanvassVanStock[]> {
    const res = await ApiService.get<{ data: CanvassVanStock[] }>(
      `${API_ENDPOINTS.CANVASS_UNLOADING_VAN_STOCK}?warehouseId=${warehouseId}`,
    )
    return res.data
  }
}
