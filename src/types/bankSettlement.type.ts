/**
 * Bank Settlement types.
 *
 * Hand-written mirror of `gudang-be/api/bank_settlements.yaml` and the generic-CRUD
 * schema `internal/pkg/genericcrud/schema/bank_settlement.go`. There is no codegen
 * here — a field missing from these interfaces fails silently as `undefined` at
 * runtime rather than as a compile error, so keep them in step with the backend.
 */

export type BankSettlementStatus = 'draft' | 'completed'
export type BankSettlementSource = 'manual' | 'import'

/** A row of `/gen/v1/bank-settlements` — the list page's data source (flat join shape). */
export interface BankSettlementListRow {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  companyName: string | null
  branchBankAccountId: number
  bankAccountLabel: string | null
  periodStart: string
  periodEnd: string
  source: BankSettlementSource
  totalCreditAmount: string
  taggedAmount: string
  untaggedAmount: string
  remark: string | null
  status: BankSettlementStatus
  splitFromId: number | null
  splitFromNo: string | null
  createdBy: number | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string | null
}

export interface BankSettlementLineRequest {
  mutationDate: string
  description: string
  amount: string
  /** Null means untagged. Mutually exclusive with giroClearingId (D13). */
  customerId: number | null
  /** The giro clearing batch this credit settles. Mutually exclusive with customerId (D13). */
  giroClearingId?: number | null
  note: string | null
}

export interface BankSettlementLineResponse extends BankSettlementLineRequest {
  id: number
  lineNo: number
  customerName: string | null
  customerCode: string | null
  giroClearingNo?: string | null
}

/** A cleared giro inside a candidate batch — also feeds the same-amount warning (D13). */
export interface ClearedGiro {
  giroId: number
  giroNo: string
  customerId: number
  customerName: string
  amount: string
  clearedDate: string
}

/** A giro clearing batch a line on this account can be tagged to (D13). */
export interface GiroClearingCandidate {
  id: number
  no: string
  status: 'deposited' | 'completed'
  depositDate: string
  clearedAmount: string
  bankMatchedAmount: string
  /** clearedAmount - bankMatchedAmount: what bank lines can still be linked for. */
  unmatchedAmount: string
  clearedGiros: ClearedGiro[]
}

export interface CreateBankSettlementRequest {
  no?: string | null
  branchId?: number | null
  branchBankAccountId: number
  periodStart: string
  periodEnd: string
  status: BankSettlementStatus
  remark?: string | null
  lines: BankSettlementLineRequest[]
}

/** Number, branch and company are stamped at creation and ignored on update. */
export type UpdateBankSettlementRequest = Omit<CreateBankSettlementRequest, 'no' | 'branchId'>

export interface BankSettlementResponse {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  companyName: string | null
  branchBankAccountId: number
  branchBankAccountLabel: string | null
  periodStart: string
  periodEnd: string
  source: BankSettlementSource
  totalCreditAmount: string
  taggedAmount: string
  untaggedAmount: string
  remark: string | null
  status: BankSettlementStatus
  splitFromId: number | null
  splitFromNo: string | null
  /** Only on the create/update response that performed a split (D4). */
  remainderSettlementId: number | null
  remainderSettlementNo: string | null
  lines: BankSettlementLineResponse[]
  createdBy: number | null
  createdAt: string
  updatedAt: string | null
}
