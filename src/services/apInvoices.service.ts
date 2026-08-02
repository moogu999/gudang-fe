import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  ApInvoiceHeader,
  ApInvoiceResponse,
  CreateApInvoiceRequest,
  UpdateApInvoiceRequest,
  InvoiceableGoodsReceipt,
} from '@/types/apInvoice.type'
import { API_ENDPOINTS } from '@/constants/api'

/**
 * Service for AP Invoice entry — matching a supplier's faktur to the approved
 * Goods Receipts it covers and recording the resulting payable.
 *
 * @example
 * ```typescript
 * const invoice = await ApInvoicesService.create({
 *   supplierId: 1,
 *   supplierInvoiceNo: 'INV/2026/07/0912',
 *   invoiceDate: '2026-07-30',
 *   goodsReceiptIds: [12, 13],
 *   status: 'draft',
 * })
 * ```
 */
export class ApInvoicesService {
  private static readonly BASE_URL = API_ENDPOINTS.AP_INVOICES

  /**
   * Fetch a paginated list of AP invoices through the generic-CRUD read model.
   *
   * @param queryString - Query parameters built with GenericQueryBuilder
   * @returns Promise resolving to paginated AP invoice list rows
   */
  static async list(queryString?: string): Promise<Base<ApInvoiceHeader>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_AP_INVOICE_HEADERS}?${queryString}`
      : API_ENDPOINTS.GEN_AP_INVOICE_HEADERS
    return ApiService.get<Base<ApInvoiceHeader>>(url)
  }

  /**
   * Fetch a single AP invoice with its covered receipts.
   *
   * @param id - AP invoice header ID
   * @returns Promise resolving to the AP invoice read model
   * @throws Error if the invoice does not exist
   */
  static async get(id: number): Promise<ApInvoiceResponse> {
    return ApiService.get<ApInvoiceResponse>(API_ENDPOINTS.AP_INVOICE_BY_ID(id))
  }

  /**
   * Create an AP invoice. A branch with a configured approval flow lands on
   * `need_approval` even when `approved` is requested; a branch without one
   * saves straight to `approved`.
   *
   * @param data - Invoice header fields plus the covered goods receipt IDs
   * @returns Promise resolving to the created AP invoice
   * @throws Error if a receipt is already invoiced or the invoice number is taken
   */
  static async create(data: CreateApInvoiceRequest): Promise<ApInvoiceResponse> {
    return ApiService.post<ApInvoiceResponse>(this.BASE_URL, data)
  }

  /**
   * Update a draft AP invoice. Branch, company and the document number are
   * stamped at creation and are not recomputed.
   *
   * @param id - AP invoice header ID
   * @param data - Replacement header fields and covered goods receipt IDs
   * @returns Promise resolving to the updated AP invoice
   * @throws Error if the invoice is no longer editable
   */
  static async update(id: number, data: UpdateApInvoiceRequest): Promise<ApInvoiceResponse> {
    return ApiService.put<ApInvoiceResponse>(API_ENDPOINTS.AP_INVOICE_BY_ID(id), data)
  }

  /**
   * Delete a draft AP invoice, releasing its covered receipts back into the picker.
   *
   * @param id - AP invoice header ID
   * @throws Error if the invoice is not in a deletable status
   */
  static async remove(id: number): Promise<void> {
    return ApiService.delete<void>(API_ENDPOINTS.AP_INVOICE_BY_ID(id))
  }

  /**
   * List approved, PO-linked goods receipts of a supplier that no other invoice
   * has claimed. The endpoint takes bespoke query parameters rather than the
   * GenericQueryBuilder triples: `supplierId`, `apInvoiceId`, `branchId`,
   * `search`, `page`, `limit`.
   *
   * @param queryString - Pre-built URLSearchParams string
   * @returns Promise resolving to the paginated picker rows
   *
   * @example
   * ```typescript
   * const params = new URLSearchParams({ supplierId: '1', page: '1', limit: '10' })
   * const receipts = await ApInvoicesService.listInvoiceableGoodsReceipts(params.toString())
   * ```
   */
  static async listInvoiceableGoodsReceipts(
    queryString?: string,
  ): Promise<Base<InvoiceableGoodsReceipt>> {
    const url = queryString
      ? `${API_ENDPOINTS.AP_INVOICE_AVAILABLE_GRS}?${queryString}`
      : API_ENDPOINTS.AP_INVOICE_AVAILABLE_GRS
    return ApiService.get<Base<InvoiceableGoodsReceipt>>(url)
  }
}
