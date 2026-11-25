import ApiService from './api'
import type { Base } from '@/types/api.type'
import type {
  SalesCreditNoteDetail,
  SalesCreditNoteListRow,
  UpdateTaxReferenceDto,
} from '@/types/salesCreditNote.type'
import { API_ENDPOINTS } from '@/constants/api'
import { GenericQueryBuilder } from './genericQueryBuilder'

/**
 * Service for Sales Credit Notes (Nota Retur). A note is issued and posted by the return
 * delivery order, so there is no create or delete here: only reads and the tax reference.
 */
export class SalesCreditNotesService {
  /** Fetch a page of notes through the generic-CRUD read model. */
  static async list(queryString?: string): Promise<Base<SalesCreditNoteListRow>> {
    const url = queryString
      ? `${API_ENDPOINTS.GEN_SALES_CREDIT_NOTES}?${queryString}`
      : API_ENDPOINTS.GEN_SALES_CREDIT_NOTES
    return ApiService.get<Base<SalesCreditNoteListRow>>(url)
  }

  static async get(id: number): Promise<SalesCreditNoteDetail> {
    return ApiService.get<SalesCreditNoteDetail>(API_ENDPOINTS.SALES_CREDIT_NOTE_BY_ID(id))
  }

  /** Set, change or clear (omit the key) the Nota Retur tax reference. */
  static async updateTaxReference(
    id: number,
    data: UpdateTaxReferenceDto,
  ): Promise<SalesCreditNoteDetail> {
    return ApiService.put<SalesCreditNoteDetail>(
      API_ENDPOINTS.SALES_CREDIT_NOTE_TAX_REFERENCE(id),
      data,
    )
  }

  /** The note issued for a return sales order, or `undefined` when it has none. */
  static async findBySalesOrder(salesOrderId: number): Promise<SalesCreditNoteListRow | undefined> {
    return this.findOneBy('sales_order_header_id', salesOrderId)
  }

  private static async findOneBy(
    filterBy: string,
    value: number,
  ): Promise<SalesCreditNoteListRow | undefined> {
    // Operator 0 is "equals" on the generic-CRUD endpoints.
    const query = new GenericQueryBuilder().withFilter(filterBy, '0', value).withLimit(1).build()
    const res = await this.list(query)
    return res.data[0]
  }
}
