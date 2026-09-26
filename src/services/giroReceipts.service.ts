import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  GiroReceiptListRow,
  GiroReceiptResponse,
  CreateGiroReceiptRequest,
  UpdateGiroReceiptRequest,
} from '@/types/giroReceipt.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for Giro Receipt — an employee hands over N physical giros received from customers.
 * Custody only: nothing touches AR until a giro's clearing result is cleared. No approval.
 */
export class GiroReceiptsService {
  private static readonly BASE_URL = API_ENDPOINTS.GIRO_RECEIPTS

  /** Fetch a paginated list of giro receipts through the generic-CRUD read model. */
  static async list(queryString?: string): Promise<Base<GiroReceiptListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_GIRO_RECEIPTS}?${queryString}`
      : API_ENDPOINTS.GEN_GIRO_RECEIPTS
    return ApiService.get<Base<GiroReceiptListRow>>(url)
  }

  static async get(id: number): Promise<GiroReceiptResponse> {
    return ApiService.get<GiroReceiptResponse>(API_ENDPOINTS.GIRO_RECEIPT_BY_ID(id))
  }

  /** Create a receipt. Requesting `completed` puts every giro into custody (`held`). */
  static async create(data: CreateGiroReceiptRequest): Promise<GiroReceiptResponse> {
    return ApiService.post<GiroReceiptResponse>(this.BASE_URL, data)
  }

  /** Update a draft receipt (PUT, not PATCH). Giros are replaced wholesale. */
  static async update(id: number, data: UpdateGiroReceiptRequest): Promise<GiroReceiptResponse> {
    return ApiService.put<GiroReceiptResponse>(API_ENDPOINTS.GIRO_RECEIPT_BY_ID(id), data)
  }

  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.GIRO_RECEIPT_BY_ID(id))
  }

  /** Void a completed receipt while every one of its giros is still held. */
  static async void(id: number, reason: string): Promise<GiroReceiptResponse> {
    return ApiService.post<GiroReceiptResponse>(API_ENDPOINTS.GIRO_RECEIPT_VOID(id), { reason })
  }
}
