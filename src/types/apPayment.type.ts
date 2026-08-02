/**
 * AP Payment (BKK — Bukti Kas Keluar) types.
 *
 * Hand-written mirror of `gudang-be/api/ap_payments.yaml` and the generic-CRUD
 * schema `internal/pkg/genericcrud/schema/ap_payment.go`. There is no codegen
 * here — a field missing from these interfaces fails silently as `undefined` at
 * runtime rather than as a compile error, so keep them in step with the backend.
 */

export type ApPaymentStatus = 'draft' | 'need_approval' | 'approved'

export type ApPaymentDocumentType = 'ap_invoice' | 'credit_note' | 'debit_note'

/**
 * A row of `/gen/v1/ap-payments` — the list page's data source.
 */
export interface ApPaymentListRow {
  id: number
  no: string
  branchId: number
  companyId: number
  companyName: string
  supplierId: number
  supplierName: string
  paymentDate: string
  paymentMethodId: number
  paymentMethodCode: string
  paymentMethodName: string
  branchBankAccountId: number | null
  referenceNo: string | null
  grossAmount: string
  creditAmount: string
  netAmount: string
  remark: string | null
  status: ApPaymentStatus
  createdBy: number | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string | null
}

/** One picked open item, as saved on the document. */
export interface ApPaymentApplicationResponse {
  id: number
  documentType: ApPaymentDocumentType
  documentId: number
  documentNo: string
  dueDate: string
  /** The document's current outstanding amount (post-application), unsigned. */
  outstandingAmount: string
  appliedAmount: string
}

/** The `/v1/ap-payments/{id}` read model. */
export interface ApPaymentResponse {
  id: number
  no: string
  status: ApPaymentStatus
  branchId: number
  companyId: number
  companyName: string | null
  companyTaxId: string | null
  supplierId: number
  supplierName: string | null
  paymentDate: string
  paymentMethodId: number
  paymentMethodCode: string
  paymentMethodName: string | null
  branchBankAccountId: number | null
  branchBankAccountLabel: string | null
  referenceNo: string | null
  grossAmount: string
  creditAmount: string
  netAmount: string
  remark: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
  applications: ApPaymentApplicationResponse[]
}

export interface ApPaymentApplicationRequest {
  documentType: ApPaymentDocumentType
  documentId: number
  /** Required for ap_invoice. IGNORED for notes — the server applies them in full. */
  appliedAmount?: string
}

export interface CreateApPaymentRequest {
  /** Omitted (null) in auto mode — the server pulls the next number series code. */
  no: string | null
  /** Optional when the user has exactly one assigned branch. Ignored on update. */
  branchId: number | null
  status: Exclude<ApPaymentStatus, 'need_approval'>
  supplierId: number
  /** 'YYYY-MM-DD' */
  paymentDate: string
  paymentMethodId: number
  branchBankAccountId: number | null
  referenceNo: string | null
  remark: string | null
  applications: ApPaymentApplicationRequest[]
}

export type UpdateApPaymentRequest = Omit<CreateApPaymentRequest, 'no' | 'branchId'>
