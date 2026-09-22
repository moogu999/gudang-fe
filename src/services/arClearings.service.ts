import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ArClearingListRow,
  ArClearingResponse,
  CreateArClearingRequest,
  UpdateArClearingRequest,
  VoidArClearingRequest,
} from '@/types/arClearing.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for AR Clearing — applies one customer's pooled, already-recorded cash (approved
 * cash deposit lines, completed bank settlement lines) to that customer's outstanding invoices.
 * A completed clearing is terminal; the only exit is void.
 */
export class ArClearingsService {
  private static readonly BASE_URL = API_ENDPOINTS.AR_CLEARINGS

  /** Fetch a paginated list of AR clearings through the generic-CRUD read model. */
  static async list(queryString?: string): Promise<Base<ArClearingListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_AR_CLEARINGS}?${queryString}`
      : API_ENDPOINTS.GEN_AR_CLEARINGS
    return ApiService.get<Base<ArClearingListRow>>(url)
  }

  static async get(id: number): Promise<ArClearingResponse> {
    return ApiService.get<ArClearingResponse>(API_ENDPOINTS.AR_CLEARING_BY_ID(id))
  }

  /** Create a clearing. Requesting `completed` posts in the same transaction. */
  static async create(data: CreateArClearingRequest): Promise<ArClearingResponse> {
    return ApiService.post<ArClearingResponse>(this.BASE_URL, data)
  }

  /** Update a draft clearing (PUT, not PATCH). Sources and allocations are replaced wholesale. */
  static async update(id: number, data: UpdateArClearingRequest): Promise<ArClearingResponse> {
    return ApiService.put<ArClearingResponse>(API_ENDPOINTS.AR_CLEARING_BY_ID(id), data)
  }

  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.AR_CLEARING_BY_ID(id))
  }

  /** Reverse a completed clearing. A reason is required. */
  static async void(id: number, data: VoidArClearingRequest): Promise<ArClearingResponse> {
    return ApiService.post<ArClearingResponse>(API_ENDPOINTS.AR_CLEARING_VOID(id), data)
  }
}
