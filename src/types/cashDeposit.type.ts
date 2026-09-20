/**
 * Cash Deposit (Setoran Kas) types.
 *
 * Hand-written mirror of `gudang-be/api/cash_deposits.yaml` and the generic-CRUD
 * schema `internal/pkg/genericcrud/schema/cash_deposit.go`. There is no codegen
 * here — a field missing from these interfaces fails silently as `undefined` at
 * runtime rather than as a compile error, so keep them in step with the backend.
 */

export type CashDepositStatus = 'draft' | 'need_approval' | 'approved'
export type CashDepositSource = 'manual' | 'nforce'
export type CashDepositLineType = 'invoice' | 'adhoc'
export type ManifestMode = 'driver' | 'collector' | 'adhoc'

/** A row of `/gen/v1/cash-deposits` — the list page's data source (flat join shape). */
export interface CashDepositListRow {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  companyName: string | null
  employeeId: number
  employeeName: string | null
  employeeTypeId: number
  employeeTypeName: string | null
  depositDate: string
  receivedByUserId: number
  receivedByEmail: string | null
  source: CashDepositSource
  recordedAmount: string
  actualAmount: string
  varianceAmount: string
  varianceReason: string | null
  remark: string | null
  status: CashDepositStatus
  createdBy: number | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string | null
}

export interface ManifestCandidate {
  invoiceId: number
  invoiceNo: string
  deliveryOrderNo: string
  customerId: number
  customerName: string
  invoiceDate: string
  ageDays: number
  totalAmount: string
  alreadyDepositedAmount: string
  remainingAmount: string
}

export interface ManifestCandidateResponse {
  mode: ManifestMode
  data: ManifestCandidate[]
  meta: { total: number; limit: number; offset: number }
}

export interface CashDepositLineRequest {
  lineType: CashDepositLineType
  invoiceId?: number | null
  customerId?: number | null
  outletName?: string | null
  categoryId?: number | null
  note?: string | null
  /** Decimal string. */
  amount: string
}

export interface CreateCashDepositRequest {
  /** Omitted (null) in auto mode — the server pulls the next number series code. */
  no: string | null
  /** Optional when the user has exactly one assigned branch. Ignored on update. */
  branchId: number | null
  /** need_approval is never client-supplied — it is only reached via the variance threshold. */
  status: Exclude<CashDepositStatus, 'need_approval'>
  employeeId: number
  /** 'YYYY-MM-DD' */
  depositDate: string
  actualAmount: string
  varianceReason: string | null
  remark: string | null
  lines: CashDepositLineRequest[]
}

export type UpdateCashDepositRequest = Omit<CreateCashDepositRequest, 'no' | 'branchId'>

export interface CashDepositLineResponse {
  id: number
  lineType: CashDepositLineType
  invoiceId: number | null
  invoiceNo: string | null
  customerId: number | null
  customerName: string | null
  outletName: string | null
  categoryId: number | null
  categoryName: string | null
  note: string | null
  /** The invoice total at save time; absent for ad-hoc lines. */
  referenceAmount: string | null
  amount: string
}

/** The `/v1/cash-deposits/{id}` read model. */
export interface CashDepositResponse {
  id: number
  no: string
  source: CashDepositSource
  status: CashDepositStatus
  branchId: number
  branchName: string | null
  companyId: number
  companyName: string | null
  employeeId: number
  employeeName: string | null
  employeeTypeId: number
  employeeTypeName: string | null
  depositDate: string
  receivedByUserId: number
  receivedByUserName: string | null
  recordedAmount: string
  actualAmount: string
  varianceAmount: string
  varianceReason: string | null
  remark: string | null
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
  lines: CashDepositLineResponse[]
}

export interface CashDepositCategory {
  id: number
  code: string
  name: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCashDepositCategoryDto {
  code: string
  name: string
  isActive: boolean
}

export interface UpdateCashDepositCategoryDto {
  code?: string
  name?: string
  isActive?: boolean
}

/** Branch-scoped variance threshold + approval flow. */
export interface CashDepositConfig {
  id: number
  branchId: number
  branchName: string
  approvalFlowId: number | null
  /** null with a flow set means any non-zero variance needs approval. */
  varianceThreshold: string | null
  createdAt: string
  createdBy: number
  updatedAt?: string | null
  updatedBy?: number | null
}

export interface UpsertCashDepositConfigDto {
  approvalFlowId?: number | null
  varianceThreshold?: string | null
}
