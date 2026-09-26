/**
 * AR Clearing types.
 *
 * Hand-written mirror of `gudang-be/api/ar_clearings.yaml`, `api/ar_outstanding.yaml` and the
 * generic-CRUD schema `internal/pkg/genericcrud/schema/ar_clearing.go`. There is no codegen
 * here — a field missing from these interfaces fails silently as `undefined` at
 * runtime rather than as a compile error, so keep them in step with the backend.
 *
 * Every money field is a decimal string. Go omits nil pointers as absent keys, not `null`.
 */

export type ArClearingStatus = 'draft' | 'completed' | 'voided'
export type ArCashSourceType = 'cash_deposit' | 'bank_settlement' | 'giro'

/** One poolable cash line. `sourceLineId` is unique only within a `sourceType` — key on the pair. */
export interface ArUnappliedCashItem {
  sourceType: ArCashSourceType
  sourceLineId: number
  sourceDocumentId: number
  sourceDocumentNo: string
  customerId: number
  sourceDate: string
  amount: string
  appliedAmount: string
  unappliedAmount: string
  /** The invoice a collector reported this cash against — cash-deposit invoice lines only. */
  hintInvoiceId?: number | null
  /** `invoice | adhoc` for a cash deposit line, `bank` for a bank settlement line. */
  sourceDetail: string
  note?: string | null
  description: string
}

/** One outstanding invoice from `ar_open_items`. */
export interface ArOpenItem {
  documentType: string
  documentId: number
  documentNo: string
  customerId: number
  customerName: string
  documentDate: string
  ageDays: number
  totalAmount: string
  settledAmount: string
  outstandingAmount: string
}

/** A row of `/gen/v1/ar-clearings` — the list page's data source (flat join shape). */
export interface ArClearingListRow {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  companyName: string | null
  customerId: number
  customerName: string | null
  customerCode: string | null
  clearingDate: string
  availableAmount: string
  allocatedAmount: string
  unallocatedAmount: string
  remark: string | null
  status: ArClearingStatus
  voidedAt: string | null
  voidReason: string | null
  createdBy: number | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string | null
}

/** The server derives what each source gives, so no amount is sent. */
export interface ArClearingSourceRequest {
  sourceType: ArCashSourceType
  sourceLineId: number
}

export interface ArClearingAllocationRequest {
  invoiceId: number
  /** Decimal string; clamped server-side to the invoice's live outstanding balance. */
  appliedAmount: string
}

export interface CreateArClearingRequest {
  /** Omitted (null) in auto mode — the server pulls the next number series code. */
  no?: string | null
  /** Optional when the user has exactly one assigned branch. Ignored on update. */
  branchId?: number | null
  customerId: number
  /** 'YYYY-MM-DD' */
  clearingDate: string
  remark?: string | null
  /** Voided is never requested — use the void endpoint. */
  status: Exclude<ArClearingStatus, 'voided'>
  sources: ArClearingSourceRequest[]
  allocations: ArClearingAllocationRequest[]
}

/** Number, branch and company are stamped at creation and ignored on update. */
export type UpdateArClearingRequest = Omit<CreateArClearingRequest, 'no' | 'branchId'>

export interface VoidArClearingRequest {
  reason: string
}

export interface ArClearingSourceResponse {
  id: number
  lineNo: number
  sourceType: ArCashSourceType
  sourceLineId: number
  sourceDocumentNo: string
  sourceDate: string
  /** On a draft this is provisional (the full remainder) and is re-derived on submit. */
  consumedAmount: string
}

export interface ArClearingAllocationResponse {
  id: number
  lineNo: number
  invoiceId: number
  invoiceNo: string
  appliedAmount: string
  /** The invoice total, snapshotted when the clearing was saved. */
  referenceAmount: string
  /** The invoice's LIVE outstanding balance now, not at save time. */
  outstandingAmount: string
}

export interface ArClearingResponse {
  id: number
  no: string
  status: ArClearingStatus
  branchId: number
  branchName?: string | null
  companyId: number
  companyName?: string | null
  customerId: number
  customerName?: string | null
  customerCode?: string | null
  clearingDate: string
  availableAmount: string
  allocatedAmount: string
  unallocatedAmount: string
  remark?: string | null
  voidedAt?: string | null
  voidedBy?: number | null
  voidReason?: string | null
  createdBy?: number | null
  createdAt: string
  updatedAt?: string | null
  sources: ArClearingSourceResponse[]
  allocations: ArClearingAllocationResponse[]
}
