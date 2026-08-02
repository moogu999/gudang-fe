import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  CreditDebitNoteListRow,
  CreditDebitNoteResponse,
  CreateCreditDebitNoteRequest,
  UpdateCreditDebitNoteRequest,
} from '@/types/creditDebitNote.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for Credit / Debit Note entry — a purely financial correction against a
 * supplier's balance. Unlike every other document in the repo, submitting with
 * `status: 'approved'` on a branch with no configured approval flow is refused
 * outright rather than posting straight through.
 *
 * @example
 * ```typescript
 * const note = await CreditDebitNotesService.create({
 *   noteType: 'credit',
 *   supplierId: 1,
 *   supplierNoteNo: 'NK/NTF/07/00089',
 *   noteDate: '2026-07-30',
 *   correctionCategoryId: 1,
 *   description: 'Selisih harga PO#4021 vs faktur',
 *   taxBaseAmount: '175000',
 *   status: 'draft',
 * })
 * ```
 */
export class CreditDebitNotesService {
  private static readonly BASE_URL = API_ENDPOINTS.CREDIT_DEBIT_NOTES

  /**
   * Fetch a paginated list of credit/debit notes through the generic-CRUD read model.
   *
   * @param queryString - Query parameters built with GenericQueryBuilder
   * @returns Promise resolving to paginated list rows
   */
  static async list(queryString?: string): Promise<Base<CreditDebitNoteListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_CREDIT_DEBIT_NOTES}?${queryString}`
      : API_ENDPOINTS.GEN_CREDIT_DEBIT_NOTES
    return ApiService.get<Base<CreditDebitNoteListRow>>(url)
  }

  /**
   * Fetch a single credit/debit note.
   *
   * @param id - Credit/debit note ID
   * @returns Promise resolving to the note read model
   * @throws Error if the note does not exist
   */
  static async get(id: number): Promise<CreditDebitNoteResponse> {
    return ApiService.get<CreditDebitNoteResponse>(API_ENDPOINTS.CREDIT_DEBIT_NOTE_BY_ID(id))
  }

  /**
   * Create a credit/debit note. A branch with no configured approval flow refuses
   * `status: 'approved'` outright (`ErrApprovalFlowRequired`) rather than posting
   * straight through — `draft` always succeeds.
   *
   * @param data - Note fields
   * @returns Promise resolving to the created note
   * @throws Error if the supplier note number or tax return note number is already claimed
   */
  static async create(data: CreateCreditDebitNoteRequest): Promise<CreditDebitNoteResponse> {
    return ApiService.post<CreditDebitNoteResponse>(this.BASE_URL, data)
  }

  /**
   * Update a draft credit/debit note. Branch, company and the document number are
   * stamped at creation and are not recomputed. This is a `PUT`, matching the backend
   * spec — not a `PATCH`.
   *
   * @param id - Credit/debit note ID
   * @param data - Replacement fields
   * @returns Promise resolving to the updated note
   * @throws Error if the note is no longer editable
   */
  static async update(
    id: number,
    data: UpdateCreditDebitNoteRequest,
  ): Promise<CreditDebitNoteResponse> {
    return ApiService.put<CreditDebitNoteResponse>(API_ENDPOINTS.CREDIT_DEBIT_NOTE_BY_ID(id), data)
  }

  /**
   * Delete a draft credit/debit note.
   *
   * @param id - Credit/debit note ID
   * @throws Error if the note is not in a deletable status
   */
  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.CREDIT_DEBIT_NOTE_BY_ID(id))
  }
}
