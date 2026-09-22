import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CashDepositListRow,
  CashDepositResponse,
  CreateCashDepositRequest,
  UpdateCashDepositRequest,
  ManifestCandidateResponse,
} from '@/types/cashDeposit.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for Cash Deposit (Setoran Kas) — the custody document recording cash an
 * employee handed over. It is custody-only: nothing outside this module is
 * written, so there is no settlement side effect on approval.
 */
export class CashDepositsService {
  private static readonly BASE_URL = API_ENDPOINTS.CASH_DEPOSITS

  /** Fetch a paginated list of cash deposits through the generic-CRUD read model. */
  static async list(queryString?: string): Promise<Base<CashDepositListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_CASH_DEPOSITS}?${queryString}`
      : API_ENDPOINTS.GEN_CASH_DEPOSITS
    return ApiService.get<Base<CashDepositListRow>>(url)
  }

  static async get(id: number): Promise<CashDepositResponse> {
    return ApiService.get<CashDepositResponse>(API_ENDPOINTS.CASH_DEPOSIT_BY_ID(id))
  }

  /**
   * Create a cash deposit. Requesting `approved` lands on `need_approval` instead
   * when the branch has a flow and the variance exceeds its threshold; a branch
   * with no flow configured never requires approval.
   */
  static async create(data: CreateCashDepositRequest): Promise<CashDepositResponse> {
    return ApiService.post<CashDepositResponse>(this.BASE_URL, data)
  }

  /** Update a draft cash deposit. Lines are replaced wholesale. */
  static async update(id: number, data: UpdateCashDepositRequest): Promise<CashDepositResponse> {
    return ApiService.put<CashDepositResponse>(API_ENDPOINTS.CASH_DEPOSIT_BY_ID(id), data)
  }

  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.CASH_DEPOSIT_BY_ID(id))
  }

  /**
   * List depositable invoices for an employee. The server reads the employee's
   * type and returns mode `driver`, `collector` or `adhoc` (no rows).
   */
  static async manifestCandidates(queryString: string): Promise<ManifestCandidateResponse> {
    return ApiService.get<ManifestCandidateResponse>(
      `${API_ENDPOINTS.CASH_DEPOSIT_MANIFEST_CANDIDATES}?${queryString}`,
    )
  }
}
