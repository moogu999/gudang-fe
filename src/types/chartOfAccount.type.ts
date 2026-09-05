export type NormalBalance = 'DEBIT' | 'CREDIT'

export interface AccountType {
  id: number
  code: string
  name: string
  defaultNormalBalance: NormalBalance
  sortOrder: number
  isActive: boolean
}

export interface ControlAccountType {
  id: number
  code: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface AccountTypeRef {
  id: number
  code: string
  name: string
}

export interface ControlAccountTypeRef {
  id: number
  code: string
  name: string
}

export interface ChartOfAccount {
  id: number
  companyId: number
  parentId: number | null
  code: string
  name: string
  accountTypeId: number
  accountType?: AccountTypeRef
  normalBalance: NormalBalance
  isHeader: boolean
  controlAccountTypeId: number | null
  controlAccountType?: ControlAccountTypeRef
  isRetainedEarnings: boolean
  depth: number
  isActive: boolean
  /** True once the account has been used in a posted journal entry. Always
   *  false until the GL module exists; freezes code / type / normal balance. */
  inUse: boolean
  createdAt: string
  createdBy: number
  updatedAt: string | null
  updatedBy: number | null
}

export interface ChartOfAccountNode extends ChartOfAccount {
  children: ChartOfAccountNode[]
}

export interface CreateChartOfAccountDto {
  companyId: number
  parentId?: number
  code: string
  name: string
  accountTypeId: number
  normalBalance?: NormalBalance
  isHeader?: boolean
  controlAccountTypeId?: number
  isRetainedEarnings?: boolean
  isActive?: boolean
}

export interface UpdateChartOfAccountDto {
  parentId?: number
  code: string
  name: string
  accountTypeId: number
  normalBalance?: NormalBalance
  isHeader?: boolean
  controlAccountTypeId?: number
  isRetainedEarnings?: boolean
  isActive?: boolean
}
