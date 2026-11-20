import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CanvassLoading,
  CanvassLoadingAvailableStock,
  CanvassLoadingRow,
  SaveCanvassLoadingRequest,
} from '@/types/canvassLoading.type'
import { API_ENDPOINTS } from '@/constants/api'
import { createListQueryAdapter } from './listQueryAdapter'

/** The warehouse side of Canvass Loading (Loading Kanvas). Salesman confirm/reject are mobile-only. */
export class CanvassLoadingsService {
  /** Pass as `TableComponent`'s `query-adapter`; the list orders by id DESC. */
  static readonly toListQuery = createListQueryAdapter([
    'status',
    'branchId',
    'salesmanId',
    'dateFrom',
    'dateTo',
  ])

  static async list(queryString?: string): Promise<Base<CanvassLoadingRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.CANVASS_LOADINGS}?${queryString}`
      : API_ENDPOINTS.CANVASS_LOADINGS
    return ApiService.get<Base<CanvassLoadingRow>>(url)
  }

  static async get(id: number): Promise<CanvassLoading> {
    return ApiService.get<CanvassLoading>(API_ENDPOINTS.CANVASS_LOADING_BY_ID(id))
  }

  static async create(data: SaveCanvassLoadingRequest): Promise<CanvassLoading> {
    return ApiService.post<CanvassLoading>(API_ENDPOINTS.CANVASS_LOADINGS, data)
  }

  /** Edits a draft, or writes the next revision of a rejected loading. */
  static async update(id: number, data: SaveCanvassLoadingRequest): Promise<CanvassLoading> {
    return ApiService.put<CanvassLoading>(API_ENDPOINTS.CANVASS_LOADING_BY_ID(id), data)
  }

  /** Sends a draft, or resends a rejected loading. */
  static async send(id: number): Promise<CanvassLoading> {
    return ApiService.post<CanvassLoading>(API_ENDPOINTS.CANVASS_LOADING_SEND(id), {})
  }

  static async cancel(id: number): Promise<CanvassLoading> {
    return ApiService.post<CanvassLoading>(API_ENDPOINTS.CANVASS_LOADING_CANCEL(id), {})
  }

  /** Good stock on hand less reserved, one entry per requested product. */
  static async availableStock(
    warehouseId: number,
    productIds: number[],
  ): Promise<CanvassLoadingAvailableStock[]> {
    const params = new URLSearchParams({
      warehouseId: String(warehouseId),
      productIds: productIds.join(','),
    })
    const res = await ApiService.get<{ data: CanvassLoadingAvailableStock[] }>(
      `${API_ENDPOINTS.CANVASS_LOADING_AVAILABLE_STOCK}?${params}`,
    )
    return res.data
  }
}
