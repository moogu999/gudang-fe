import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  BankSettlementListRow,
  BankSettlementResponse,
  CreateBankSettlementRequest,
  UpdateBankSettlementRequest,
} from '@/types/bankSettlement.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for Bank Settlement — a period of credit (inflow) mutations on a company
 * bank account, each line optionally tagged to the outlet that paid. Attribution-only:
 * nothing is settled against AR and nothing is posted.
 */
export class BankSettlementsService {
  private static readonly BASE_URL = API_ENDPOINTS.BANK_SETTLEMENTS

  /** Fetch a paginated list of bank settlements through the generic-CRUD read model. */
  static async list(queryString?: string): Promise<Base<BankSettlementListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_BANK_SETTLEMENTS}?${queryString}`
      : API_ENDPOINTS.GEN_BANK_SETTLEMENTS
    return ApiService.get<Base<BankSettlementListRow>>(url)
  }

  static async get(id: number): Promise<BankSettlementResponse> {
    return ApiService.get<BankSettlementResponse>(API_ENDPOINTS.BANK_SETTLEMENT_BY_ID(id))
  }

  /**
   * Create a bank settlement. Requesting `completed` runs the split: tagged lines stay
   * on the document, untagged lines move to a new draft (`remainderSettlementId`).
   */
  static async create(data: CreateBankSettlementRequest): Promise<BankSettlementResponse> {
    return ApiService.post<BankSettlementResponse>(this.BASE_URL, data)
  }

  /** Update a draft bank settlement (PUT, not PATCH). Lines are replaced wholesale. */
  static async update(
    id: number,
    data: UpdateBankSettlementRequest,
  ): Promise<BankSettlementResponse> {
    return ApiService.put<BankSettlementResponse>(API_ENDPOINTS.BANK_SETTLEMENT_BY_ID(id), data)
  }

  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.BANK_SETTLEMENT_BY_ID(id))
  }
}
