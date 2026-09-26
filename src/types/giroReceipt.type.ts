/**
 * Giro Receipt (Penerimaan Giro) + Giro Register types.
 *
 * Hand-written mirror of `gudang-be/api/giro_receipts.yaml`, `gudang-be/api/giros.yaml` and the
 * generic-CRUD schema `internal/pkg/genericcrud/schema/giro_receipt.go`. There is no codegen
 * here — a field missing from these interfaces fails silently as `undefined` at runtime rather
 * than as a compile error, so keep them in step with the backend.
 */

export type GiroReceiptStatus = 'draft' | 'completed' | 'voided'
export type GiroStatus = 'draft' | 'held' | 'clearing' | 'cleared' | 'rejected' | 'voided'
export type GiroReceiptSource = 'manual' | 'nforce'

/** A row of `/gen/v1/giro-receipts` — the list page's data source (flat join shape). */
export interface GiroReceiptListRow {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  employeeId: number
  employeeName: string | null
  employeeTypeId: number
  employeeTypeName: string | null
  receiptDate: string
  receivedByUserId: number
  receivedByEmail: string | null
  source: GiroReceiptSource
  recordedCount: number
  recordedAmount: string
  actualCount: number
  actualAmount: string
  varianceCount: number
  varianceAmount: string
  status: GiroReceiptStatus
  createdAt: string
  updatedAt: string | null
}

export interface GiroLineRequest {
  giroNo: string
  issuingBank: string
  /** Must be a customer with paysWithGiro = true. */
  customerId: number
  /** 'YYYY-MM-DD' */
  giroDate: string
  /** 'YYYY-MM-DD', not before giroDate. */
  dueDate: string
  /** Decimal string, > 0. */
  amount: string
}

export interface CreateGiroReceiptRequest {
  /** Omitted in auto mode — the server pulls the next number series code. */
  no?: string | null
  /** Optional when the user has exactly one assigned branch. Ignored on update. */
  branchId?: number | null
  /** 'YYYY-MM-DD' */
  receiptDate: string
  employeeId: number
  actualCount: number
  /** Decimal string. */
  actualAmount: string
  /** UI-required when either variance is non-zero; the server doesn't enforce it. */
  varianceReason?: string | null
  remark?: string | null
  status: 'draft' | 'completed'
  giros: GiroLineRequest[]
}

/** Number and branch are stamped at creation and ignored on update. */
export type UpdateGiroReceiptRequest = Omit<CreateGiroReceiptRequest, 'no' | 'branchId'>

export interface GiroResponse {
  id: number
  lineNo: number
  giroNo: string
  issuingBank: string
  customerId: number
  customerName?: string | null
  customerCode?: string | null
  giroDate: string
  dueDate: string
  amount: string
  appliedAmount: string
  status: GiroStatus
  clearedDate?: string | null
  rejectedDate?: string | null
  rejectionNote?: string | null
}

export interface GiroReceiptResponse {
  id: number
  no: string
  source: GiroReceiptSource
  status: GiroReceiptStatus
  branchId: number
  branchName?: string | null
  companyId: number
  companyName?: string | null
  employeeId: number
  employeeName?: string | null
  employeeTypeId: number
  employeeTypeName?: string | null
  receiptDate: string
  receivedByUserId: number
  receivedByUserName?: string | null
  recordedCount: number
  recordedAmount: string
  actualCount: number
  actualAmount: string
  varianceCount: number
  varianceAmount: string
  varianceReason?: string | null
  remark?: string | null
  voidedAt?: string | null
  voidedBy?: number | null
  voidReason?: string | null
  createdBy?: number | null
  createdAt: string
  updatedAt?: string | null
  giros: GiroResponse[]
}

// ---------------------------------------------------------------------------
// Giro Register — GET /v1/giros
// ---------------------------------------------------------------------------

export type GiroBucket = 'custody' | 'held' | 'due_soon' | 'overdue' | 'clearing' | 'history'

export interface GiroRegisterRow {
  id: number
  giroNo: string
  issuingBank: string
  customerId: number
  customerName: string
  receiptId: number
  receiptNo: string
  receiptDate: string
  branchId: number
  branchName?: string | null
  giroDate: string
  dueDate: string
  /** dueDate minus today; negative when overdue. */
  daysToDue: number
  amount: string
  appliedAmount: string
  status: Extract<GiroStatus, 'held' | 'clearing' | 'cleared' | 'rejected'>
  clearingId?: number | null
  clearingNo?: string | null
  clearedDate?: string | null
  rejectedDate?: string | null
  rejectionNote?: string | null
}

export interface GiroBucketCounts {
  custody: number
  held: number
  dueSoon: number
  overdue: number
  clearing: number
  history: number
}

export interface GiroRegisterResponse {
  data: GiroRegisterRow[]
  meta: { total: number; limit: number; offset: number; counts: GiroBucketCounts }
}

export interface GiroRegisterParams {
  bucket?: GiroBucket
  /** Without it the register shows every branch the user holds. */
  branchId?: number
  customerId?: number
  search?: string
  /** 'YYYY-MM-DD' — only giros due on or before this date (clearing picker). */
  dueOnOrBefore?: string
  /** 1-based. The register paginates with page/limit, not offset. */
  page?: number
  limit?: number
}
