/**
 * Credit / Debit Note types.
 *
 * Hand-written mirror of `gudang-be/api/credit_debit_notes.yaml` and of the generic-CRUD
 * schema `internal/pkg/genericcrud/schema/credit_debit_note.go`. There is no codegen here —
 * a field missing from these interfaces fails silently as `undefined` at runtime rather than
 * as a compile error, so keep them in step with the backend.
 */

export type CreditDebitNoteStatus = 'draft' | 'need_approval' | 'approved'
export type CreditDebitNoteType = 'credit' | 'debit'

/**
 * A row of `/gen/v1/credit-debit-notes` — the list page's data source.
 * `signedTotalAmount` is server-computed (a CASE expression in `GetQuery`), so the list
 * never re-derives the sign.
 */
export interface CreditDebitNoteListRow {
  id: number
  no: string
  noteType: CreditDebitNoteType
  branchId: number
  companyId: number
  companyName: string
  supplierId: number
  supplierName: string
  supplierNoteNo: string
  noteDate: string
  taxReturnNoteNo: string | null
  correctionCategoryId: number
  correctionCategoryName: string
  apInvoiceHeaderId: number | null
  apInvoiceNo: string | null
  description: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  signedTotalAmount: string
  settledAmount: string
  remark: string | null
  status: CreditDebitNoteStatus
  createdBy: number | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string | null
}

/** The `/v1/credit-debit-notes/{id}` read model. */
export interface CreditDebitNoteResponse {
  id: number
  no: string
  noteType: CreditDebitNoteType
  status: CreditDebitNoteStatus
  branchId: number
  companyId: number
  companyName: string | null
  /** The legal entity's NPWP. */
  companyTaxId: string | null
  supplierId: number
  supplierName: string | null
  supplierNoteNo: string
  noteDate: string
  taxReturnNoteNo: string | null
  correctionCategoryId: number
  correctionCategoryName: string | null
  apInvoiceHeaderId: number | null
  apInvoiceNo: string | null
  description: string
  taxBaseAmount: string
  taxAmount: string
  totalAmount: string
  /** Always 0 until AP Payment exists; nothing in this release writes it. */
  settledAmount: string
  remark: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
}

/**
 * Note there is no `totalAmount` here — the mirror image of AP Invoice, where DPP is
 * derived and never sent. Here `taxBaseAmount` is the whole content of the document,
 * entered by the caller.
 */
export interface CreateCreditDebitNoteRequest {
  /** Omitted (null) in auto mode — the server pulls the next number series code. */
  no?: string | null
  /** Optional when the user has exactly one assigned branch. Ignored on update. */
  branchId?: number | null
  status: 'draft' | 'approved'
  noteType: CreditDebitNoteType
  supplierId: number
  /** The principal's own document number; unique per supplier. */
  supplierNoteNo: string
  /** 'YYYY-MM-DD' */
  noteDate: string
  /** Nota Retur / Faktur Pajak Pengganti number. Required to submit only when there is PPN. */
  taxReturnNoteNo?: string | null
  correctionCategoryId: number
  /** Optional reference AP invoice, audit trail only. Must belong to the same supplier and company. */
  apInvoiceHeaderId?: number | null
  description: string
  /** DPP — the whole content of the document, entered by the caller. */
  taxBaseAmount: string
  /** Omit to let the server compute DPP × the configured tax rate. */
  taxAmount?: string | null
  remark?: string | null
}

export type UpdateCreditDebitNoteRequest = Omit<CreateCreditDebitNoteRequest, 'no'>
