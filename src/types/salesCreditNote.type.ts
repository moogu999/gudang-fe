import type { PinnedUom } from './pinnedUom.type'

/**
 * Sales Credit Note (Nota Retur) types.
 *
 * Hand-written mirror of `gudang-be/api/sales_credit_notes.yaml` and the generic-CRUD
 * schema `internal/pkg/genericcrud/schema/sales_credit_note.go`. There is no codegen here,
 * so a field missing from these interfaces fails silently as `undefined` at runtime. Go omits
 * nil pointers instead of sending `null`: test optional keys with `== null` / `!x`.
 */

/** A row of `/gen/v1/sales-credit-notes` — the list page's data source (flat join shape). */
export interface SalesCreditNoteListRow {
  id: number
  no: string
  noteDate: string
  postedAt: string
  deliveryOrderId: number
  deliveryOrderNo: string
  salesOrderHeaderId: number
  salesOrderNo: string
  sourceInvoiceId?: number | null
  sourceInvoiceNo?: string | null
  customerId: number
  customerCode: string
  customerName: string
  branchId: number
  branchName: string
  companyId: number
  salesmanName?: string | null
  totalAmount: string
  appliedAmount: string
  taxReturnNoteNo?: string | null
}

export interface SalesCreditNoteRef {
  id: number
  code: string
}

export interface SalesCreditNoteLine {
  productId: number
  productCode: string
  productName: string
  quantity: string
  pinnedUom?: PinnedUom | null
  price: string
  discount: string
  subAmount: string
  taxBaseAmount: string
  taxAmount: string
}

export interface SalesCreditNoteDetail {
  id: number
  no: string
  noteDate: string
  postedAt: string
  postedBy?: { id: number; name: string }
  deliveryOrder: SalesCreditNoteRef
  salesOrder: SalesCreditNoteRef
  sourceInvoice?: SalesCreditNoteRef
  customer: { id: number; code: string; name: string }
  branch: { id: number; name: string }
  company: { id: number; name: string }
  salesman: { id: number; name: string }
  subtotalAmount: string
  discountAmount: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  appliedAmount: string
  outstandingAmount: string
  taxReturnNoteNo?: string
  lines: SalesCreditNoteLine[]
}

/** Omit `taxReturnNoteNo` (or send it empty) to clear the reference. */
export interface UpdateTaxReferenceDto {
  taxReturnNoteNo?: string
}

export type SalesCreditNoteAppliedStatus = 'none' | 'partial' | 'full'
