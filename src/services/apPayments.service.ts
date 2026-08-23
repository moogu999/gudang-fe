import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ApPaymentListRow,
  ApPaymentResponse,
  CreateApPaymentRequest,
  UpdateApPaymentRequest,
} from '@/types/apPayment.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for AP Payment (BKK) — the terminal document that closes an open AP
 * invoice or credit/debit note by recording money leaving the company.
 * Approval *is* the disbursement: the transition into `approved` is what writes
 * `settled_amount` on the applied documents.
 */
export class ApPaymentsService {
  private static readonly BASE_URL = API_ENDPOINTS.AP_PAYMENTS

  /**
   * Fetch a paginated list of AP payments through the generic-CRUD read model.
   */
  static async list(queryString?: string): Promise<Base<ApPaymentListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_AP_PAYMENTS}?${queryString}`
      : API_ENDPOINTS.GEN_AP_PAYMENTS
    return ApiService.get<Base<ApPaymentListRow>>(url)
  }

  /**
   * Fetch a single AP payment with its picked open items.
   */
  static async get(id: number): Promise<ApPaymentResponse> {
    return ApiService.get<ApPaymentResponse>(API_ENDPOINTS.AP_PAYMENT_BY_ID(id))
  }

  /**
   * Create an AP payment. Whether it lands on `draft`, `need_approval` or
   * `approved` is decided server-side by the branch's threshold-gated config —
   * see `ApPaymentConfigData.RequiresApproval`.
   *
   * @throws Error (400 `ErrApprovalFlowRequired`) if the net requires approval
   * and the branch has no flow configured.
   */
  static async create(data: CreateApPaymentRequest): Promise<ApPaymentResponse> {
    return ApiService.post<ApPaymentResponse>(this.BASE_URL, data)
  }

  /**
   * Update a draft AP payment. Branch, company, supplier and the document
   * number are stamped at creation and are not recomputed.
   */
  static async update(id: number, data: UpdateApPaymentRequest): Promise<ApPaymentResponse> {
    return ApiService.put<ApPaymentResponse>(API_ENDPOINTS.AP_PAYMENT_BY_ID(id), data)
  }

  /**
   * Delete a draft AP payment, releasing its picked open items back into the picker.
   */
  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.AP_PAYMENT_BY_ID(id))
  }
}
