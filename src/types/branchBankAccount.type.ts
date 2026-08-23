/**
 * Branch Bank Account master data — the account an AP Payment's disbursement
 * leaves from. Keyed on `branch_id` (the operating unit that holds the
 * account), not `company_id`. Mirrors
 * `gudang-be/internal/pkg/genericcrud/schema/branch_bank_account.go`.
 */
export interface BranchBankAccount {
  id: number
  branchId: number
  branchName: string
  bankName: string
  accountNumber: string
  accountHolderName: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  createdBy: number | null
  updatedAt: string | null
  updatedBy: number | null
}

export interface CreateBranchBankAccountDto {
  branchId: number
  bankName: string
  accountNumber: string
  accountHolderName: string
  isDefault: boolean
  isActive: boolean
  createdBy: number
}

export interface UpdateBranchBankAccountDto {
  bankName?: string
  accountNumber?: string
  accountHolderName?: string
  isDefault?: boolean
  isActive?: boolean
  updatedBy: number
}
