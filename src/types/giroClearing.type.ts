/**
 * Giro Clearing (Setor Kliring) + Clearing Result (Hasil Kliring) types.
 *
 * Hand-written mirror of `gudang-be/api/giro_clearings.yaml` and the generic-CRUD schema
 * `internal/pkg/genericcrud/schema/giro_clearing.go`. There is no codegen here — keep them in
 * step with the backend.
 */

import type { GiroStatus } from './giroReceipt.type'

export type GiroClearingStatus = 'draft' | 'deposited' | 'completed'
export type GiroClearingResult = 'pending' | 'cleared' | 'rejected'

/** A row of `/gen/v1/giro-clearings` — the list page's data source (flat join shape). */
export interface GiroClearingListRow {
  id: number
  no: string
  branchId: number
  branchName: string | null
  companyId: number
  branchBankAccountId: number
  bankAccountLabel: string | null
  depositDate: string
  lineCount: number
  pendingCount: number
  totalAmount: string
  clearedAmount: string
  rejectedAmount: string
  bankMatchedAmount: string
  remark: string | null
  status: GiroClearingStatus
  createdAt: string
  updatedAt: string | null
}

export interface CreateGiroClearingRequest {
  /** Omitted in auto mode — the server pulls the next number series code. */
  no?: string | null
  /** Optional when the user has exactly one assigned branch. Ignored on update. */
  branchId?: number | null
  branchBankAccountId: number
  /** 'YYYY-MM-DD' */
  depositDate: string
  remark?: string | null
  status: 'draft' | 'deposited'
  /** Held giros, in line order. May be empty on a draft. */
  giroIds: number[]
}

export type UpdateGiroClearingRequest = Omit<CreateGiroClearingRequest, 'no' | 'branchId'>

export interface GiroClearingResultLine {
  lineId: number
  result: Exclude<GiroClearingResult, 'pending'>
  /** Required when result is rejected. */
  note?: string | null
}

export interface GiroClearingResultsRequest {
  /** 'YYYY-MM-DD', not before the deposit date. */
  resultDate: string
  lines: GiroClearingResultLine[]
}

export interface GiroClearingLineResponse {
  id: number
  lineNo: number
  giroId: number
  giroNo: string
  issuingBank: string
  customerId: number
  customerName?: string | null
  receiptNo?: string | null
  giroDate?: string | null
  dueDate: string
  /** Snapshot of the giro's amount. */
  amount: string
  result: GiroClearingResult
  resultDate?: string | null
  note?: string | null
  giroStatus: GiroStatus
}

export interface GiroClearingResponse {
  id: number
  no: string
  status: GiroClearingStatus
  branchId: number
  branchName?: string | null
  companyId: number
  companyName?: string | null
  branchBankAccountId: number
  bankAccountLabel?: string | null
  depositDate: string
  totalAmount: string
  clearedAmount: string
  rejectedAmount: string
  bankMatchedAmount: string
  pendingCount: number
  remark?: string | null
  createdBy?: number | null
  createdAt: string
  updatedAt?: string | null
  lines: GiroClearingLineResponse[]
}
