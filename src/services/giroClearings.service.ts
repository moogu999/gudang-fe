import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  GiroClearingListRow,
  GiroClearingResponse,
  CreateGiroClearingRequest,
  UpdateGiroClearingRequest,
  GiroClearingResultsRequest,
} from '@/types/giroClearing.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for Giro Clearing — a batch of held giros deposited to one branch bank account, and
 * the per-giro clearing results that follow. Results are final; there is no undo.
 */
export class GiroClearingsService {
  private static readonly BASE_URL = API_ENDPOINTS.GIRO_CLEARINGS

  /** Fetch a paginated list of giro clearings through the generic-CRUD read model. */
  static async list(queryString?: string): Promise<Base<GiroClearingListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_GIRO_CLEARINGS}?${queryString}`
      : API_ENDPOINTS.GEN_GIRO_CLEARINGS
    return ApiService.get<Base<GiroClearingListRow>>(url)
  }

  static async get(id: number): Promise<GiroClearingResponse> {
    return ApiService.get<GiroClearingResponse>(API_ENDPOINTS.GIRO_CLEARING_BY_ID(id))
  }

  /** Create a batch. Requesting `deposited` moves every picked giro to `clearing`. */
  static async create(data: CreateGiroClearingRequest): Promise<GiroClearingResponse> {
    return ApiService.post<GiroClearingResponse>(this.BASE_URL, data)
  }

  /** Update a draft batch (PUT, not PATCH). Giros are replaced wholesale. */
  static async update(id: number, data: UpdateGiroClearingRequest): Promise<GiroClearingResponse> {
    return ApiService.put<GiroClearingResponse>(API_ENDPOINTS.GIRO_CLEARING_BY_ID(id), data)
  }

  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.GIRO_CLEARING_BY_ID(id))
  }

  /** Record cleared/rejected results for some or all pending lines of a deposited batch. */
  static async recordResults(
    id: number,
    data: GiroClearingResultsRequest,
  ): Promise<GiroClearingResponse> {
    return ApiService.post<GiroClearingResponse>(API_ENDPOINTS.GIRO_CLEARING_RESULTS(id), data)
  }
}
