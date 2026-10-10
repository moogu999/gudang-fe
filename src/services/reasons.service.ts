import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  Reason,
  ReasonCreatePayload,
  ReasonListQuery,
  ReasonType,
  ReasonUpdatePayload,
} from '@/types/reason.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Reason codes. The list is small (tens per type) and comes back unpaged,
 * ordered by type, active first, then display order.
 */
export class ReasonsService {
  private static readonly BASE_URL = API_ENDPOINTS.REASONS

  static async list(query: ReasonListQuery = {}): Promise<Base<Reason>> {
    const params = new URLSearchParams()
    if (query.type) params.set('type', query.type)
    if (query.isActive !== undefined) params.set('isActive', String(query.isActive))
    if (query.sellingMode) params.set('sellingMode', query.sellingMode)
    if (query.search) params.set('search', query.search)
    const qs = params.toString()
    return ApiService.get<Base<Reason>>(qs ? `${this.BASE_URL}?${qs}` : this.BASE_URL)
  }

  static async get(id: number): Promise<Reason> {
    return ApiService.get<Reason>(`${this.BASE_URL}/${id}`)
  }

  static async create(payload: ReasonCreatePayload): Promise<Reason> {
    return ApiService.post<Reason>(this.BASE_URL, payload)
  }

  /** The type and code are fixed after create. */
  static async update(id: number, payload: ReasonUpdatePayload): Promise<Reason> {
    return ApiService.put<Reason>(`${this.BASE_URL}/${id}`, payload)
  }

  /** 409 `last_active_reason` / `reason_in_use` when the delete is refused. */
  static async delete(id: number): Promise<void> {
    return ApiService.delete<void>(`${this.BASE_URL}/${id}`)
  }

  /** `ids` must be exactly the type's active reason ids, in the new order. */
  static async reorder(type: ReasonType, ids: number[]): Promise<void> {
    return ApiService.post<void>(API_ENDPOINTS.REASONS_REORDER, { type, ids })
  }
}
